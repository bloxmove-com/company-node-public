import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, OnApplicationBootstrap } from '@nestjs/common';
import { AssetService, ConfigService, VerifiableCredential } from '@bloxmove-com/did-asset-library-core-obfuscated';
import {
  IRentalRequest,
  IRentalConfirmation,
  IVehicleContractData,
  IRentalEndRequest,
  IUsageData,
  IVehicleServiceAggregator,
  IDoorStatusUpdateRequest,
} from '../common/interfaces/interfaces';
import { FleetBackendService } from '../fleet-backend/fleet-backend.service';
import { AccessTokenResponse } from '../common/classes/access-token-response.class';
import { RentalRequest } from '../common/classes/rental-request.class';
import { RentalConfirmation } from '../common/classes/rental-confirmation.class';
import { WrongPackageData } from '../common/exceptions/wrong-package-data.exception';
import { SettlementService } from '../settlement/settlement.service';
import { BloxmoveTompGatewayService } from '../tomp/bloxmove-tomp-gateway.service';
import { RentalHelperService } from './rental-helper/rental-helper.service';
import { BackfillHttpService } from './backfill-http/backfill-http.service';
import { InvalidAccessToken } from '../common/exceptions/invalid-access-token.exception';
import { VerifiablePresentation } from '@bloxmove-com/did-asset-library-core-obfuscated';
import { AccessTokenRequest } from '../common/classes/access-token-request.class';
import jwt_decode from 'jwt-decode';

@Injectable()
export class VehicleRentalService implements OnApplicationBootstrap {
  private readonly logger = new Logger(VehicleRentalService.name);

  private readonly ourDID;
  private readonly apiType;
  private readonly ownFleetNodeUrl;

  readonly offerConfirm = '/offerConfirm';
  readonly consumerConfirm = '/consumerConfirm';
  readonly providerConfirm = '/providerConfirm';
  readonly consumerAccessTokenRequest = '/consumerAccessTokenRequest';
  readonly consumerEndRequest = '/consumerEndRequest';
  readonly providerEndConfirm = '/providerEndConfirm';
  readonly consumerEndConfirm = '/consumerEndConfirm';

  constructor(
    private readonly config: ConfigService,
    private readonly assetService: AssetService,
    private readonly fleetBackendService: FleetBackendService,
    private readonly bloxmoveTompGatewayService: BloxmoveTompGatewayService,
    private readonly rentalHelperService: RentalHelperService,
    private readonly settlementService: SettlementService,
    private readonly backfillHttpService: BackfillHttpService,
  ) {
    this.ourDID = this.config.getOrThrow('accountDID');
    this.apiType = this.config.get('apiType');
    this.ownFleetNodeUrl = this.config.get('ownFleetNodeUrl');
  }

  public async onApplicationBootstrap(): Promise<void> {
    await this.settlementService.registerForSettlement();
  }

  async startRental(rentalRequest: IRentalRequest): Promise<VerifiableCredential | string> {
    let consumerVCs;
    if (rentalRequest.verifiablePresentation) {
      consumerVCs = await this.assetService.validateVerifiablePresentation(rentalRequest.consumerDID, rentalRequest.verifiablePresentation);
      if (consumerVCs.length === 0) {
        this.logger.debug(`failed to validate the consumer Presentation`);
        throw new ForbiddenException();
      }
    } else {
      throw new ForbiddenException();
    }

    const vehicleDID = rentalRequest.vehicleDID;

    this.logger.debug('Get the vin from the assetDID');
    let vin: string;

    if (this.apiType === 'tomp') {
      vin = vehicleDID;
      this.logger.debug('Use temp-asset-id as vin of tomp transport operator ' + vin);
    } else {
      try {
        vin = await this.assetService.getDataProperty(vehicleDID, 'vin');
      } catch (err) {
        this.logger.debug(`error getting vin for vehicle: ${vehicleDID}`);
        throw new BadRequestException(`invalid vehicleDID: ${vehicleDID}`);
      }
    }
    this.logger.debug('The extracted vin: ' + vin);

    const packageId = rentalRequest.packageId;
    const consumerDID = rentalRequest.consumerDID;

    const myVehicle: boolean = await this.rentalHelperService.checkIsMyVehicle(rentalRequest.vehicleDID);

    if (myVehicle) {
      this.logger.log(`Using own-package with Id: ${packageId} to rent vehicle with DID: ${rentalRequest.vehicleDID}`);
      return await this.startDirectRental(vin, packageId, consumerDID, vehicleDID, consumerVCs);
    } else {
      if (this.config.get('backfillEnabled') !== 'true') {
        throw new BadRequestException('Invalid vehicle or package id');
      }
      const backfillPackage = this.fleetBackendService.getBackfillPackage(rentalRequest.packageId);
      if (!backfillPackage) {
        throw new NotFoundException(`The requested package wasn't found. Maybe it was meanwhile booked by another party.`);
      }
      this.logger.log(
        `Using backfill-package with Id: ${backfillPackage.packages[0].packageId} to rent vehicle with DID: ${backfillPackage.vehicleDID}`,
      );
      return await this.startBackfillRental(packageId, consumerDID, backfillPackage, consumerVCs);
    }
  }

  async completeStart(rentalConfirmation: IRentalConfirmation) {
    this.logger.log(`Complete Start rental ${JSON.stringify(rentalConfirmation)}`);
    this.logger.log(`Validating Verifiable Presentation...`);
    let consumerDID;
    if (typeof rentalConfirmation.verifiablePresentation === 'string') {
      const decoded = jwt_decode(rentalConfirmation.verifiablePresentation);
      consumerDID = decoded['iss'];
    } else {
      consumerDID = rentalConfirmation.verifiablePresentation.proof.verificationMethod.replace('#controller', '');
    }
    const validatedVP = await this.assetService.validateVerifiablePresentation(consumerDID, rentalConfirmation.verifiablePresentation);
    if (validatedVP.length === 0) {
      this.logger.debug(`Failed to validate the offer Presentation`);
      throw new ForbiddenException();
    }
    this.logger.log(`Setting up verifiable credentials`);
    const offerVC = validatedVP.find((vc) => vc.credentialSubject['topic'] === this.offerConfirm);
    const consumerVC = validatedVP.find((vc) => vc.credentialSubject['topic'] === this.consumerConfirm);

    this.logger.log(`Get ContractDID from offer VC`);
    const contractDID = offerVC.credentialSubject['id'];

    this.logger.debug(`Get contract data from contractAsset ${contractDID}`);
    const contractData: IVehicleContractData = await this.rentalHelperService.getContractData(contractDID);
    this.logger.debug(`The contract data: ${JSON.stringify(contractData)}`);

    this.logger.debug(`Check contract status, 'usageData' and attestation 'providerEndConfirm' should not exist`);
    await this.rentalHelperService.checkFlowStatus(contractDID, 'completeStart');
    this.logger.debug(`The contract status is valid`);
    const offerVCIssuer = typeof offerVC.issuer === 'object' ? offerVC.issuer.id : offerVC.issuer;
    const consumerVCIssuer = typeof consumerVC.issuer === 'object' ? consumerVC.issuer.id : consumerVC.issuer;

    if (
      consumerVC === undefined ||
      offerVC === undefined ||
      offerVC.credentialSubject['id'] !== contractDID ||
      offerVCIssuer !== this.ourDID ||
      consumerVCIssuer !== contractData.consumerDID ||
      offerVC.credentialSubject['topic'] !== this.offerConfirm ||
      consumerVC.credentialSubject['topic'] !== this.consumerConfirm
    ) {
      this.logger.debug('Validation of VC failed');
      throw new ForbiddenException();
    }

    this.logger.debug(`Check and wait for the attestation '/offerConfirm'`);
    await this.rentalHelperService.waitForVerification(contractDID, this.offerConfirm, this.ourDID);
    this.logger.debug(`Attestation '/offerConfirm' has been set`);

    const myVehicle: boolean = await this.rentalHelperService.checkIsMyVehicle(contractData.vehicleDID);

    if (myVehicle) {
      this.logger.debug(`Book the vehicle: ${contractData.vehicleDID}`);

      if (this.apiType === 'tomp') {
        this.logger.debug(`Enter tomp flow and confirm booking`);
        await this.bloxmoveTompGatewayService.confirmBooking(contractData.bookingId);
        this.logger.debug(`TOMP booking confirmed`);
      } else {
        await this.fleetBackendService.bookVehicle(contractData.vehicleDID, contractData.packageId);
      }
      this.logger.debug(`The vehicle has been booked`);
    }

    this.logger.debug(`Set '/consumerConfirm' attestation on behalf of consumer: ${contractData.consumerDID}`);
    await this.assetService.setAttestation(contractDID, this.consumerConfirm, consumerVC);
    this.logger.debug(`Attestation '/consumerConfirm' has been set`);

    // temporary solution: only apply agreements to own vehicles due to smartVIN limitation
    if (myVehicle) {
      this.settlementService
        .createAndStartAgreement(contractData, contractDID)
        .then((agreementId) => {
          if (agreementId) {
            this.logger.debug(`Set agreement id ${agreementId} to contract`);
            this.assetService
              .createDataProperty(contractDID, 'agreementId', agreementId, 'contractAsset', false)
              .catch((reason) => this.logger.error('Error setting aggrement id in contract', reason));
          }
        })
        .catch((reason) => this.logger.error('Error creating agreement in settlement service', reason));
    }

    const credentialSubject = {
      id: contractDID,
      topic: this.providerConfirm,
    };
    const providerConfirmationVc = await this.assetService.createVerifiableCredential(['ProviderConfirmCredential'], credentialSubject);
    this.logger.debug(`Set '/providerConfirm' attestation by fleetOwner` + JSON.stringify(providerConfirmationVc));
    this.assetService
      .setAttestation(contractDID, this.providerConfirm, providerConfirmationVc)
      .catch((reason) => this.logger.log(`Catch error by set '/providerConfirm' attestation`, reason));
    this.logger.debug(`Request to set attestation '/providerConfirm' has been sent`);
  }

  async endRental(rentalEndRequest: IRentalEndRequest) {
    this.logger.log(`End rental request ${JSON.stringify(rentalEndRequest)}`);

    let consumerDID;
    if (typeof rentalEndRequest.verifiablePresentation === 'string') {
      const decoded = jwt_decode(rentalEndRequest.verifiablePresentation);
      consumerDID = decoded['iss'];
    } else {
      consumerDID = rentalEndRequest.verifiablePresentation.proof.verificationMethod.replace('#controller', '');
    }
    const validatedVP = await this.assetService.validateVerifiablePresentation(consumerDID, rentalEndRequest.verifiablePresentation);
    if (validatedVP.length === 0) {
      this.logger.debug(`Failed to validate the offer Presentation`);
      throw new ForbiddenException();
    }

    this.logger.log(`Setting up verifiable credentials`);
    const offerVC = validatedVP.find((vc) => vc.credentialSubject['topic'] === this.offerConfirm);

    const consumerEndRequestVC = validatedVP.find((vc) => vc.credentialSubject['topic'] === this.consumerEndRequest);
    this.logger.log(`Get ContractDID from offer VC`);
    const contractDID = offerVC.credentialSubject['id'];

    this.logger.debug(`Get data form contractAsset ${contractDID}`);
    const contractData: IVehicleContractData = await this.rentalHelperService.getContractData(contractDID);
    this.logger.debug(`The contract data: ${JSON.stringify(contractData)}`);

    if (consumerEndRequestVC) {
      const validatedVC = await this.assetService.validateVerifiableCredential(consumerEndRequestVC);
      this.logger.debug('validated VC: ' + JSON.stringify(validatedVC));

      const consumerVCIssuer = typeof validatedVC.issuer === 'object' ? validatedVC.issuer.id : validatedVC.issuer;
      const offerVCIssuer = typeof offerVC.issuer === 'object' ? offerVC.issuer.id : offerVC.issuer;
      if (
        validatedVC === undefined ||
        consumerVCIssuer !== contractData.consumerDID ||
        offerVCIssuer !== this.ourDID ||
        validatedVC.credentialSubject['id'] !== contractDID ||
        validatedVC.credentialSubject['topic'] !== this.consumerEndRequest
      ) {
        this.logger.debug('Validation of VC failed');
        throw new ForbiddenException();
      }
    } else {
      throw new BadRequestException('verifiableCredential must be present');
    }

    this.logger.debug(`Check contract status, 'usageData' should not exist and attestation 'providerConfirm' should exist`);
    await this.rentalHelperService.checkFlowStatus(contractDID, 'endRental');
    this.logger.debug(`The contract status is valid`);

    this.logger.debug(`Get data form contractAsset ${contractDID}`);

    const myVehicle: boolean = await this.rentalHelperService.checkIsMyVehicle(contractData.vehicleDID);
    let usageData: IUsageData;
    if (myVehicle) {
      // fleetnode own the vehicle
      if (this.apiType === 'tomp') {
        this.logger.debug(`End tomp booking and get usage data`);
        usageData = await this.bloxmoveTompGatewayService.endBooking(contractData.bookingId);
      } else {
        this.logger.debug(`Release vehicle ${contractData.vehicleDID} and get usage data`);
        usageData = await this.fleetBackendService.releaseVehicle(contractData.vehicleDID);
      }
    } else {
      const backfillContractDID = await this.rentalHelperService.verifyInvolvementAndGetReferencedContractDID(this.ourDID, contractDID);
      this.logger.debug(`Backfill contract DID: ${JSON.stringify(backfillContractDID)}`);
      const fleetnodeUrl: string = await this.fleetBackendService.getFleetNodeUrl(contractData.vehicleDID);
      const backfillCredentialSubject = {
        id: backfillContractDID,
        topic: this.consumerEndRequest,
      };
      const backfillEndVC = await this.assetService.createVerifiableCredential(['ConsumerEndRequestCredential'], backfillCredentialSubject);

      const backfillEndVP = (await this.assetService.createVerifiablePresentation([backfillEndVC, offerVC])) as VerifiablePresentation;
      const backfillRentalEndRequest: IRentalEndRequest = {
        verifiablePresentation: backfillEndVP,
      };
      const backfillUsageData = await this.backfillHttpService.sendRentalEndRequestToExternalFleetNode(fleetnodeUrl, backfillRentalEndRequest);

      const pricePerMin = contractData.pricePerMinute;
      const pricePerKm = contractData.pricePerKm;
      const price = contractData.pricePerMinute !== 0 ? backfillUsageData.rentalDuration * pricePerMin : backfillUsageData.rentalMileage * pricePerKm;
      const resaleUsageData: IUsageData = {
        finalPrice: price,
        rentalDuration: backfillUsageData.rentalDuration,
        rentalEndLocLat: backfillUsageData.rentalEndLocLat,
        rentalEndLocLong: backfillUsageData.rentalEndLocLong,
        rentalEndMileage: backfillUsageData.rentalEndMileage,
        rentalEndTime: backfillUsageData.rentalEndTime,
        rentalMileage: backfillUsageData.rentalMileage,
        rentalStartLocLat: backfillUsageData.rentalStartLocLat,
        rentalStartLocLong: backfillUsageData.rentalStartLocLong,
        rentalStartMileage: backfillUsageData.rentalStartMileage,
        rentalStartTime: backfillUsageData.rentalStartTime,
      };
      usageData = resaleUsageData;
    }

    const usageDataAsJsonString = JSON.stringify(usageData);
    this.logger.debug(`The usage data: ${usageDataAsJsonString}`);
    this.assetService.createDataProperty(contractDID, 'usageData', usageDataAsJsonString, 'contractAsset').then(
      () => this.logger.debug('Usage data has been set to resale contract'),
      (reason) => this.logger.error(`Catch error by set data property to resale contract`, reason),
    );
    this.logger.debug(`Request to set  usage data has been sent to resale contract`);

    this.logger.debug(`Set '/providerEndConfirm' attestation fleetOwner`);
    const credentialSubject = {
      id: contractDID,
      topic: this.providerEndConfirm,
    };
    const providerEndConfirmVC = await this.assetService.createVerifiableCredential(['ProviderEndConfirmCredential'], credentialSubject);
    this.assetService.setAttestation(contractDID, this.providerEndConfirm, providerEndConfirmVC).then(
      () => this.logger.debug(`Attestation '/providerEndConfirm' has been set`),
      (reason) => this.logger.error(`Catch error by set '/providerEndConfirm' attestation`, reason),
    );
    return usageData;
  }

  async completeEnd(rentalEndConfirmation: IRentalConfirmation) {
    this.logger.log(`Complete end rental ${JSON.stringify(rentalEndConfirmation)}`);
    let consumerDID;
    if (typeof rentalEndConfirmation.verifiablePresentation === 'string') {
      const decoded = jwt_decode(rentalEndConfirmation.verifiablePresentation);
      consumerDID = decoded['iss'];
    } else {
      consumerDID = rentalEndConfirmation.verifiablePresentation.proof.verificationMethod.replace('#controller', '');
    }
    const validatedVP = await this.assetService.validateVerifiablePresentation(consumerDID, rentalEndConfirmation.verifiablePresentation);
    if (validatedVP.length === 0) {
      this.logger.debug(`Failed to validate the offer Presentation`);
      throw new ForbiddenException();
    }

    this.logger.log(`Setting up verifiable credentials`);
    const offerVC = validatedVP.find((vc) => vc.credentialSubject['topic'] === this.offerConfirm);
    const consumerEndConfirmVC = validatedVP.find((vc) => vc.credentialSubject['topic'] === this.consumerEndConfirm);

    this.logger.log(`Get ContractDID from offer VC`);
    const contractDID = offerVC.credentialSubject['id'];

    this.logger.debug(`Get data from contractAsset ${contractDID}`);
    const contractData: IVehicleContractData = await this.rentalHelperService.getContractData(contractDID);
    this.logger.debug(`The contract data: ${JSON.stringify(contractData)}`);

    this.logger.debug(`Check and wait for the usage data to be set`);
    const usageData = await this.rentalHelperService.waitForDataPropertyInContractAsset(contractDID, 'usageData');
    this.logger.debug(`The usage data has been set`);

    this.logger.debug(`Check and wait for the attestation '/providerEndConfirm'`);
    await this.rentalHelperService.waitForVerification(contractDID, this.providerEndConfirm, this.ourDID);
    this.logger.debug(`Attestation '/providerEndConfirm' has been set`);

    this.logger.debug(`Check contract status, attestation 'consumerEndConfirm' should not exist`);
    await this.rentalHelperService.checkFlowStatus(contractDID, 'completeEnd', contractData.consumerDID);
    this.logger.debug(`The contract status is valid`);

    const validatedVC = await this.assetService.validateVerifiableCredential(consumerEndConfirmVC);
    this.logger.debug('validated VC: ' + JSON.stringify(validatedVC));

    const consumerEndVCIssuer = typeof validatedVC.issuer === 'object' ? validatedVC.issuer.id : validatedVC.issuer;
    const offerVCIssuer = typeof offerVC.issuer === 'object' ? offerVC.issuer.id : offerVC.issuer;

    if (
      validatedVC === undefined ||
      consumerEndVCIssuer !== contractData.consumerDID ||
      offerVCIssuer !== this.ourDID ||
      validatedVC.credentialSubject['id'] !== contractDID ||
      validatedVC.credentialSubject['topic'] !== this.consumerEndConfirm
    ) {
      this.logger.debug('Validation of VC failed');
      throw new ForbiddenException();
    }

    const agreementId = await this.assetService.getDataProperty(contractDID, 'agreementId', 'contractAsset');

    const myVehicle: boolean = await this.rentalHelperService.checkIsMyVehicle(contractData.vehicleDID);

    if (!myVehicle) {
      if (agreementId) {
        this.logger.debug('Calling end agreement and settle agreement for backfill vehicle');
        // must wait for response since downstream agreement must be ended first before ending backfill agreement
        await this.settlementService.endAgreement(agreementId, usageData);
        this.settlementService.settleAgreement(agreementId).catch((reason) => this.logger.error(`Error settling agreement ${agreementId}`, reason));
      }
      const backfillContractDID = await this.rentalHelperService.verifyInvolvementAndGetReferencedContractDID(this.ourDID, contractDID);
      const fleetnodeUrl: string = await this.fleetBackendService.getFleetNodeUrl(contractData.vehicleDID);
      const credentialSubject = {
        id: backfillContractDID,
        topic: this.consumerEndConfirm,
      };
      const endConfirmVC = await this.assetService.createVerifiableCredential(['ConsumerEndConfirmCredential'], credentialSubject);
      const backfillEndVP = (await this.assetService.createVerifiablePresentation([endConfirmVC, offerVC])) as VerifiablePresentation;
      const backfillRentalEndConfirmation: IRentalConfirmation = {
        verifiablePresentation: backfillEndVP,
      };
      await this.backfillHttpService.sendRentalEndConfirmationToExternalFleetNode(fleetnodeUrl, backfillRentalEndConfirmation);
    }

    this.logger.debug(`Set '/consumerEndConfirm' attestation on behalf of consumer: ${contractData.consumerDID}`);
    this.assetService.setAttestation(contractDID, this.consumerEndConfirm, consumerEndConfirmVC).then(
      () => this.logger.debug(`Attestation '/consumerEndConfirm' has been set`),
      (reason) => {
        this.logger.error(`Catch error by set '/consumerEndConfirm' attestation`, reason);
      },
    );
    this.logger.debug(`Request to set attestation '/consumerEndConfirm' has been sent`);

    // settlement and payment for own vehicle
    if (agreementId && myVehicle) {
      this.logger.debug('Calling end agreement and settle agreement for own vehicle');
      this.settlementService
        .endAgreement(agreementId, usageData)
        .catch((reason) => this.logger.error(`Error ending agreement ${agreementId}`, reason))
        .then(() =>
          this.settlementService.settleAgreement(agreementId).catch((reason) => this.logger.error(`Error settling agreement ${agreementId}`, reason)),
        );
    }
  }

  private async startDirectRental(vin: string, packageId: number, consumerDID: string, vehicleDID: string, consumerVCs: VerifiableCredential[]) {
    let rentalContractData: IVehicleContractData = {};

    if (this.apiType === 'tomp') {
      this.logger.debug('Request a tomp booking and get rental contract data');
      rentalContractData = await this.bloxmoveTompGatewayService.requestBooking(vin);
      this.logger.debug('Request tomp booking finished');
    } else {
      this.logger.debug('Get data from fleetBackend');
      rentalContractData = await this.fleetBackendService.getRentalRelevantDataFromFleetBackend(vin, packageId);
    }
    rentalContractData.consumerDID = consumerDID;
    rentalContractData.vehicleDID = vehicleDID;
    this.logger.debug(`The Contract data: ${JSON.stringify(rentalContractData)}`);

    await this.rentalHelperService.checkConsumerVerifiableCredentials(rentalContractData, consumerVCs);
    this.logger.debug('Consumer claims are valid');

    this.logger.debug('Create Rental-ContractAsset');
    const contractCreateObject = {
      contractData: JSON.stringify(rentalContractData),
    };
    const rentalContractDID = await this.assetService.createAsset('rentalContract', contractCreateObject, 'contractAsset');
    this.logger.debug(`The Rental-ContractAssetDID: ${rentalContractDID}`);
    const credentialSubject = {
      id: rentalContractDID,
      topic: this.offerConfirm,
    };
    const rentalConfirmationVc = await this.assetService.createVerifiableCredential(['OfferConfirmCredential'], credentialSubject);
    this.logger.debug(`Set '/offerConfirm' attestation by fleetOwner` + JSON.stringify(rentalConfirmationVc));
    this.assetService.setAttestation(rentalContractDID, this.offerConfirm, rentalConfirmationVc).then(
      () => this.logger.log(` attestation '/offerConfirm' has been set`),
      (reason) => this.logger.error(`Catch error by set '/offerConfirm' attestation`, reason),
    );
    this.logger.debug(`Request to set attestation '/offerConfirm' has been sent`);

    return rentalConfirmationVc;
  }

  private async startBackfillRental(
    packageId: number,
    consumerDID: string,
    backfillPackage: IVehicleServiceAggregator,
    consumerVCs: VerifiableCredential[],
  ) {
    const resalePackage = this.fleetBackendService.getResalePackage(packageId);
    // Check consumer claim
    const temporaryContractData: IVehicleContractData = {
      requiredUserClaims: resalePackage.requiredUserClaims,
      requiredBusinessClaims: resalePackage.requiredBusinessClaims,
      consumerDID,
    };
    await this.rentalHelperService.checkConsumerVerifiableCredentials(temporaryContractData, consumerVCs);
    this.logger.debug('Consumer claims are valid');
    const companyVC = JSON.parse(this.config.get('companyClaim'));

    // Create and confirm backfill contract
    const rentalVP = await this.assetService.createVerifiablePresentation(companyVC);
    const rentalRequestFleetNode: IRentalRequest = new RentalRequest(
      backfillPackage.vehicleDID,
      this.ourDID,
      backfillPackage.packages[0].packageId,
      rentalVP,
    );
    this.logger.debug(`Send Rental Request to external fleet node: ${JSON.stringify(rentalRequestFleetNode)}`);
    const backfillContractDID: string = (
      await this.backfillHttpService.sendRentalRequestToExternalFleetNode(backfillPackage.fleetNodeUrl, rentalRequestFleetNode)
    ).contractDID;
    this.logger.debug(`Backfill-ContractDID: ${backfillContractDID}`);

    // Verify and check data
    this.logger.debug(`Get data from Backfill-ContractAsset ${backfillContractDID}`);
    const backfillContractData: IVehicleContractData = await this.rentalHelperService.getDataPropertyFromContract(
      backfillContractDID,
      'contractData',
      'contractAsset',
    );
    this.logger.debug(`The contract data in Backfill-ContractAsset: ${JSON.stringify(backfillContractData)}`);
    if (
      backfillContractData.vehicleDID !== backfillPackage.vehicleDID ||
      backfillContractData.consumerDID !== this.ourDID ||
      backfillContractData.pricePerMinute !== backfillPackage.packages[0].pricePerMinute ||
      backfillContractData.pricePerKm !== backfillPackage.packages[0].pricePerKm
    ) {
      throw new WrongPackageData();
    }

    // Create resale rentalContract and reference the backfill contract
    const resaleContractData: IVehicleContractData = {
      vehicleDID: backfillPackage.vehicleDID,
      consumerDID,
      pricePerKm: resalePackage.pricePerKm,
      pricePerMinute: resalePackage.pricePerMinute,
      requiredUserClaims: resalePackage.requiredUserClaims,
      requiredBusinessClaims: null,
      termsConditions: resalePackage.termsConditions,
    };
    const referencedContractsArray: string[] = [];
    referencedContractsArray.push(backfillContractDID);
    const contractCreateObject = {
      contractData: JSON.stringify(resaleContractData),
      referencedContracts: JSON.stringify(referencedContractsArray),
    };

    const resaleContractDID = await this.assetService.createAsset('rentalContract', contractCreateObject, 'contractAsset');
    this.logger.debug(`The Resale-ContractAssetDID: ${resaleContractDID}`);

    // Confirm backfill contract
    const backfillSubject = {
      id: backfillContractDID,
      topic: this.consumerConfirm,
    };
    const backfillConfirmationVc = await this.assetService.createVerifiableCredential(['ConsumerConfirmCredential'], backfillSubject);
    // const backfillConfirmation: IRentalConfirmation = new RentalConfirmation(backfillContractDID, backfillConfirmationVc);
    await this.backfillHttpService.sendRentalConfirmationToExternalFleetNode(backfillPackage.fleetNodeUrl, backfillConfirmationVc as string);

    // Confirm resale contract offer
    const resaleSubject = {
      id: resaleContractDID,
      topic: this.offerConfirm,
    };
    const resaleConfirmationVc = await this.assetService.createVerifiableCredential(['OfferConfirmCredential'], resaleSubject);
    // const resaleConfirmation: IRentalConfirmation = new RentalConfirmation(resaleContractDID, resaleConfirmationVc);

    // SetAttestation /offerConfirm on the resale contract
    this.logger.debug(`Set '/offerConfirm' attestation by fleetOwner` + JSON.stringify(resaleConfirmationVc));
    this.assetService.setAttestation(resaleContractDID, this.offerConfirm, resaleConfirmationVc).then(
      () => this.logger.log(` attestation '/offerConfirm' has been set to resale contract`),
      (reason) => this.logger.error(`Catch error by set '/offerConfirm' attestation to resale contract`, reason),
    );
    this.logger.debug(`Request to set attestation '/offerConfirm' has been sent to resale contract`);

    // remove the generated package from the local map.
    this.fleetBackendService.setBackfillPackageBooked(packageId);

    return resaleConfirmationVc;
  }

  public async getAccessToken(accessTokenRequest: AccessTokenRequest): Promise<AccessTokenResponse> {
    this.logger.debug(`Get data from contractAsset ${JSON.stringify(accessTokenRequest)}`);
    let consumerDID;
    if (typeof accessTokenRequest.verifiablePresentation === 'string') {
      const decoded = jwt_decode(accessTokenRequest.verifiablePresentation);
      consumerDID = decoded['iss'];
    } else {
      consumerDID = accessTokenRequest.verifiablePresentation.proof.verificationMethod.replace('#controller', '');
    }
    const validatedVP = await this.assetService.validateVerifiablePresentation(consumerDID, accessTokenRequest.verifiablePresentation);
    if (validatedVP.length === 0) {
      this.logger.debug(`Failed to validate the offer Presentation`);
      throw new ForbiddenException();
    }

    this.logger.log(`Setting up verifiable credentials`);
    const offerVC = validatedVP.find((vc) => vc.credentialSubject['topic'] === this.offerConfirm);
    const consumerAccessTokenVC = validatedVP.find((vc) => vc.credentialSubject['topic'] === this.consumerAccessTokenRequest);

    if (!offerVC || !consumerAccessTokenVC) {
      this.logger.debug(`Failed to validate the offer Presentation`);
      throw new ForbiddenException();
    }
    const contractDID = offerVC.credentialSubject['id'];

    const contractData: IVehicleContractData = await this.rentalHelperService.getContractData(contractDID);
    this.logger.debug(`The contract data: ${JSON.stringify(contractData)}`);

    this.logger.debug(`Check contract status, 'usageData' should not exist`);
    await this.rentalHelperService.checkFlowStatus(contractDID, 'accessToken');
    this.logger.debug(`The contract status is valid`);

    this.logger.debug(`Check and wait for the attestation '/providerConfirm'`);
    await this.rentalHelperService.waitForVerification(contractDID, this.providerConfirm, this.ourDID);
    this.logger.debug(`Attestation '/providerConfirm' has been set`);

    this.logger.debug(`Check and wait for the attestation '/consumerConfirm'`);
    await this.rentalHelperService.waitForVerification(contractDID, this.consumerConfirm, contractData.consumerDID);
    this.logger.debug(`Attestation '/consumerConfirm' has been set`);

    if (consumerAccessTokenVC) {
      const accessTokenVcMaxFutureExpirationInSeconds = this.config.get('accessTokenVcMaxFutureExpirationInSeconds');
      if (new Date(consumerAccessTokenVC.expirationDate) > new Date(Date.now() + Number(accessTokenVcMaxFutureExpirationInSeconds) * 1000)) {
        throw new ForbiddenException(`expiration date of VC is more than ${accessTokenVcMaxFutureExpirationInSeconds}s in the future`);
      }

      let validatedVC;
      // Handle vc string of auth header
      // if (
      //   typeof consumerAccessTokenVC === 'string' &&
      //   (consumerAccessTokenVC.includes('EcdsaSecp256k1RecoverySignature2020') ||
      //     consumerAccessTokenVC.includes('Ed25519Signature2018'))
      // ) {
      //   validatedVC = await this.assetService.validateVerifiableCredential(JSON.parse(consumerAccessTokenVC));
      // } else {
      validatedVC = await this.assetService.validateVerifiableCredential(consumerAccessTokenVC);
      // }
      this.logger.debug('validated VC: ' + JSON.stringify(validatedVC));

      if (validatedVC === undefined) {
        this.logger.debug('Validation of VC signature failed');
        throw new ForbiddenException('Failed to validate the provided access credentials signature');
      }

      if (Array.isArray(validatedVC.credentialSubject)) {
        throw new BadRequestException('Verifiable credential in auth header must have a single credential subject');
      } else {
        const consumerAccessTokenVCIssuer = typeof validatedVC.issuer === 'object' ? validatedVC.issuer.id : validatedVC.issuer;
        const offerVCIssuer = typeof offerVC.issuer === 'object' ? offerVC.issuer.id : offerVC.issuer;
        if (
          consumerAccessTokenVCIssuer !== contractData.consumerDID ||
          offerVCIssuer !== this.ourDID ||
          validatedVC.credentialSubject['id'] !== contractDID ||
          validatedVC.credentialSubject['topic'] !== this.consumerAccessTokenRequest
        ) {
          this.logger.debug('Validation of VC data failed');
          throw new ForbiddenException('Failed to validate the provided access credentials data');
        }
      }
    } else {
      throw new BadRequestException('verifiableCredential must be present in the header');
    }

    let verifiableCredentialArray: Array<VerifiableCredential | string> = [];
    let carWalletEndpoint: string;
    const myVehicle: boolean = await this.rentalHelperService.checkIsMyVehicle(contractData.vehicleDID);

    if (!myVehicle) {
      const backfillContractDID = await this.rentalHelperService.verifyInvolvementAndGetReferencedContractDID(this.ourDID, contractDID);
      const externalFleetEndpoint = await this.fleetBackendService.getFleetNodeUrl(contractData.vehicleDID);
      const backfillCredentialSubject = {
        id: backfillContractDID,
        topic: this.consumerAccessTokenRequest,
      };
      const backfillExpirationDate = new Date(Date.now() + Number(this.config.get('accessTokenExpirationSeconds')) * 1000).toISOString();
      const accessVC = await this.assetService.createVerifiableCredential(
        ['RequestAccessTokenCredential'],
        backfillCredentialSubject,
        null,
        backfillExpirationDate,
      );
      const accessTokenResponse = await this.backfillHttpService.getAccessTokenFromExternalFleetNode(
        externalFleetEndpoint,
        backfillContractDID,
        JSON.stringify(accessVC),
      );
      verifiableCredentialArray = verifiableCredentialArray.concat(accessTokenResponse.verifiableCredentials);
      carWalletEndpoint = accessTokenResponse.endpoint;
    } else {
      if (this.apiType === 'tomp') {
        carWalletEndpoint = this.ownFleetNodeUrl;
      } else {
        carWalletEndpoint = await this.assetService.getDataProperty(contractData.vehicleDID, 'authEndpoint');
      }
    }
    const credentialSubject = {
      id: contractData.consumerDID,
      vehicleDID: contractData.vehicleDID,
      rentalContractDID: contractDID,
    };
    const expirationDate = new Date(Date.now() + Number(this.config.get('accessTokenExpirationSeconds')) * 1000).toISOString();
    const verifiableAccessCredential = await this.assetService.createVerifiableCredential(
      ['VehicleAccessCredential'],
      credentialSubject,
      null,
      expirationDate,
    );
    verifiableCredentialArray.push(verifiableAccessCredential);
    this.logger.debug(`Amount of VerifiableCredentials: ${verifiableCredentialArray.length}`);
    return new AccessTokenResponse(verifiableCredentialArray, carWalletEndpoint);
  }

  public async verifyAccessTokenAndUpdateTompLeg(doorStatusUpdateRequest: IDoorStatusUpdateRequest) {
    this.logger.debug(`verifyAccessToken ...`);
    this.logger.debug('accessToken: ' + JSON.stringify(doorStatusUpdateRequest.accessToken));

    let consumerDID;
    if (typeof doorStatusUpdateRequest.accessToken === 'string') {
      const decoded = jwt_decode(doorStatusUpdateRequest.accessToken);
      consumerDID = decoded['iss'];
    } else {
      consumerDID = doorStatusUpdateRequest.accessToken.proof.verificationMethod.replace('#controller', '');
    }
    const validatedVP = await this.assetService.validateVerifiablePresentation(consumerDID, doorStatusUpdateRequest.accessToken);
    if (validatedVP.length === 0) {
      this.logger.debug(`Failed to validate the offer Presentation`);
      throw new ForbiddenException();
    }

    this.logger.log(`Setting up verifiable credentials`);
    const vehicleAccessVC = validatedVP.find((vc) => vc.type.includes('VehicleAccessCredential'));

    this.logger.log(`Get ContractDID from offer VC`);
    const contractDID = vehicleAccessVC.credentialSubject['rentalContractDID'];

    const contractDataAsString = await this.assetService.getDataProperty(contractDID, 'contractData', 'contractAsset');
    let contractData: IVehicleContractData;
    if (contractDataAsString) {
      contractData = JSON.parse(contractDataAsString);
    }
    if (!contractData) {
      throw new NotFoundException('Contract not found');
    }
    const validatedVCs = await this.assetService.validateVerifiablePresentation(contractData.consumerDID, doorStatusUpdateRequest.accessToken);
    this.logger.debug('Validated VCs: ' + JSON.stringify(validatedVCs));
    // check if VerifiableCredential exists
    if (validatedVCs.length === 0) {
      this.logger.error(`Invalid access token`);
      throw new InvalidAccessToken();
    }
    // determine the owner of the vehicle
    const vehicleDID = validatedVCs[0].credentialSubject['vehicleDID'];
    let vehicleOwnerDID;
    let vinInAsset;

    if (this.apiType === 'tomp') {
      vehicleOwnerDID = this.ourDID;
      vinInAsset = vehicleDID;
    } else {
      vehicleOwnerDID = await this.assetService.getOwner(vehicleDID);
      // look up the VIN and verify that it is configured
      vinInAsset = await this.assetService.getDataProperty(vehicleDID, 'vin');
    }
    this.logger.debug(`VIN in VerifiableCredential of accessToken: ${vinInAsset}`);
    // verify the chain of VerifiableCredentials
    const verifiableCredential = await this.rentalHelperService.verifyVerifiableCredentialChain(validatedVCs, vehicleOwnerDID);
    this.logger.debug(`verify for consumer: ${verifiableCredential.credentialSubject['id']}`);
    this.logger.debug(JSON.stringify(validatedVCs));

    await this.bloxmoveTompGatewayService.changeDoorStatus(contractData.bookingId, doorStatusUpdateRequest.status);
  }
}
