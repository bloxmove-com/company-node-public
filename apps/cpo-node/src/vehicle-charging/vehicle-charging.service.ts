import { Injectable, Logger, HttpException, ForbiddenException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';
import { AssetService, ConfigService, VerifiableCredential } from '@bloxmove-com/did-asset-library-core-obfuscated';
import { IDataProperties } from '../common/interfaces/interfaces';
import { ChargingHelperService } from './charging-helper/charging-helper.service';
import { ChargingStartRequest } from '../common/classes/charging-start-request.class';
import { ChargingUpdateRequest } from '../common/classes/charging-update-request.class';
import { ChargingEndRequest } from '../common/classes/charging-end-request.class';
import { AuthorizationRequest } from '../common/classes/authorization-request.class';
import { AuthorizationCallback } from '../common/classes/authorization-callback.class';
import { AuthorizationEndRequest } from '../common/classes/authorization-end-request.class';
import { JWTVerifiableInvoiceUtilService, VCVerifiableInvoiceUtilService } from '@bloxmove-com/verifiable-invoice-obfuscated';

@Injectable()
export class VehicleChargingService {
  private readonly logger = new Logger(VehicleChargingService.name);

  private readonly ourDID;
  private readonly ssiWalletBaseUrl: string;
  private readonly energyWebBaseUrl: string;
  private readonly cpoBackendBaseUrl: string;
  private readonly cpoBackendApiKey: string;
  private readonly ownNodeUrl: string;
  private readonly accountPrivateKey: string;
  private readonly enableVCVP: string;

  readonly offerConfirm = '/offerConfirm';
  readonly consumerConfirm = '/consumerConfirm';
  readonly providerConfirm = '/providerConfirm';
  readonly consumerEndRequest = '/consumerEndRequest';
  readonly consumerEndConfirm = '/consumerEndConfirm';
  readonly providerEndConfirm = '/providerEndConfirm';
  readonly providerUpdateChargeConfirm = '/providerUpdateChargeConfirm';

  constructor(
    private readonly config: ConfigService,
    private readonly assetService: AssetService,
    private readonly chargingHelperService: ChargingHelperService,
    private httpService: HttpService,
  ) {
    this.ourDID = this.config.getOrThrow('accountDID');
    this.accountPrivateKey = this.config.get('accountPrivateKey');
    this.ownNodeUrl = this.config.get('ownNodeUrl');
    this.ssiWalletBaseUrl = this.config.get('ssiWalletBaseUrl');
    this.energyWebBaseUrl = this.config.get('energyWebBaseUrl');
    this.cpoBackendBaseUrl = this.config.get('cpoBackendBaseUrl');
    this.cpoBackendApiKey = this.config.get('cpoBackendApiKey');
    this.enableVCVP = this.config.get('enableVCVP');
  }

  async chargeSessionAuthorize(authorizationRequest: AuthorizationRequest): Promise<any> {
    this.logger.log('Incoming session-start authorization request: ');
    this.logger.log(JSON.stringify(authorizationRequest));

    const currentTimeStamp = new Date().toISOString();
    const ocpiTokenUID = authorizationRequest.token.uid;
    const evseId = authorizationRequest.session.evse_uid;

    // create contract
    const contractData: IDataProperties = { ocpiTokenUID, currentTimeStamp, ...authorizationRequest.session };
    const contractCreateObject = {
      contractData: JSON.stringify(contractData),
    };

    const chargingContractDID = await this.assetService.createAsset('chargingContract', contractCreateObject, 'contractAsset');

    const ssiWalletUrl = this.ssiWalletBaseUrl + '/vc-api/exchanges';

    const ssiWalletRequestData = this.chargingHelperService.createExchangePayloadForSessionStart(chargingContractDID, evseId, currentTimeStamp, [
      { url: `${this.ownNodeUrl}/charge-session-authorization-callback` },
    ]);

    let ssiWalletResponse;
    try {
      ssiWalletResponse = await lastValueFrom(this.httpService.post(ssiWalletUrl, ssiWalletRequestData).pipe(map((res) => res.data)));
    } catch (error) {
      this.logger.error('Error by creating presentation exchange at the SSI-Wallet');
      throw new HttpException('Error by creating presentation exchange at the SSI-Wallet', error.response?.status);
    }

    this.logger.log('SSI Wallet Response:');
    this.logger.log(ssiWalletResponse);

    const energyWebUrl = this.energyWebBaseUrl + '/api/presentation';

    const energyWebRequestData = {
      presentationLink: {
        type: 'vc-api-exchange',
        url: `${this.ssiWalletBaseUrl}/vc-api/exchanges/${chargingContractDID}`,
        ssiSession: '',
      },
      ocpiTokenUID,
    };

    let energyWebResponse;
    try {
      energyWebResponse = await lastValueFrom(this.httpService.post(energyWebUrl, energyWebRequestData).pipe(map((res) => res.data)));
      this.logger.log('Energy Web Response: ');
      this.logger.log(energyWebResponse);
    } catch (error) {
      this.logger.error('Error by sending presentation invitation to Energy Web', error);
      throw new HttpException('Error by sending presentation invitation to Energy Web', error.response?.status);
    }

    // set offerConfirm attestation
    const vc = await this.setAttestation(chargingContractDID, this.offerConfirm, 'OfferConfirmCredential');

    if (this.enableVCVP === 'true') {
      return { offerConfirmCredential: vc };
    }

    return { contractDID: chargingContractDID };
  }

  async handleChargeSessionAuthorizationCallback(chargeSessionAuthorizationCallback: AuthorizationCallback): Promise<void> {
    const contractDID = chargeSessionAuthorizationCallback.exchangeId;
    const vp = chargeSessionAuthorizationCallback.presentationSubmission?.vp.presentation;

    const ewfRoleCredential = vp.verifiableCredential.find((vc) => vc.type.includes('EWFRole'));
    const role = ewfRoleCredential.credentialSubject.role.namespace;

    if (role !== 'customer.roles.rebeam.apps.eliagroup.iam.ewc') {
      this.logger.error(`User has no valid EWF-Role: ${role}`);
      throw new ForbiddenException(`User has no valid EWF-Role: ${role}`);
    }

    this.logger.log('Session-Start Authorization Callback: ');
    this.logger.log(JSON.stringify(chargeSessionAuthorizationCallback));

    const cpoBackendUrl = `${this.cpoBackendBaseUrl}/authorization-successful`;

    const cpoBackendRequestData = {
      contractDID,
    };

    try {
      const jwt = await this.getCpoBackendJwt();
      const result = await lastValueFrom(
        this.httpService.post(cpoBackendUrl, cpoBackendRequestData, { headers: { Authorization: `Bearer ${jwt}` } }).pipe(map((res) => res.data)),
      );
      this.logger.log('CPO-Backend response: ');
      this.logger.log(JSON.stringify(result));

      // set consumerConfirm attestation
      this.setAttestation(contractDID, this.consumerConfirm, 'ConsumerConfirmCredential');
    } catch (error) {
      this.logger.error('Error by sending authorization successful to the CPO-Backend', error);
      throw new HttpException('Error by sending authorization successful to the CPO-Backend', error.response?.status);
    }
  }

  async chargeEndSessionAuthorize(authorizationEndRequest: AuthorizationEndRequest): Promise<void> {
    this.logger.log('Incoming session-end authorization request: ');
    this.logger.log(JSON.stringify(authorizationEndRequest));

    const ocpiTokenUID = authorizationEndRequest.token.uid;
    const chargingContractDID = authorizationEndRequest.contractDID;
    const currentTimeStamp = new Date().toISOString();
    const kwh = authorizationEndRequest.session.kwh;
    const evseId = authorizationEndRequest.session.evse_uid;

    const ssiWalletUrl = this.ssiWalletBaseUrl + '/vc-api/exchanges';

    const ssiWalletRequestData = this.chargingHelperService.createExchangePayloadForSessionEnd(chargingContractDID, evseId, currentTimeStamp, kwh, [
      { url: `${this.ownNodeUrl}/charge-end-session-authorization-callback` },
    ]);

    let ssiWalletResponse;
    try {
      ssiWalletResponse = await lastValueFrom(this.httpService.post(ssiWalletUrl, ssiWalletRequestData).pipe(map((res) => res.data)));
    } catch (error) {
      this.logger.error('Error by creating presentation exchange at the SSI-Wallet', error);
      throw new HttpException('Error by creating presentation exchange at the SSI-Wallet', error.response?.status);
    }

    this.logger.log('SSI Wallet Response: ');
    this.logger.log(ssiWalletResponse);

    const energyWebUrl = this.energyWebBaseUrl + '/api/presentation';

    const energyWebRequestData = {
      presentationLink: {
        type: 'vc-api-exchange',
        url: `${this.ssiWalletBaseUrl}/vc-api/exchanges/${chargingContractDID}end`,
        ssiSession: '',
      },
      ocpiTokenUID,
    };

    let energyWebResponse;
    try {
      energyWebResponse = await lastValueFrom(this.httpService.post(energyWebUrl, energyWebRequestData).pipe(map((res) => res.data)));
      this.logger.log('Energy Web Response: ');
      this.logger.log(energyWebResponse);
    } catch (error) {
      this.logger.error('Error by sending presentation invitation to Energy Web', error);
      throw new HttpException('Error by sending presentation invitation to Energy Web', error.response?.status);
    }

    // set consumerEndRequest attestation
    this.setAttestation(chargingContractDID, this.consumerEndRequest, 'ConsumerEndRequestCredential');
  }

  async handleChargeEndSessionAuthorizationCallback(chargeSessionEndAuthorizationCallback: AuthorizationCallback): Promise<void> {
    this.logger.log('Session-End Authorization Callback: ');
    this.logger.log(JSON.stringify(chargeSessionEndAuthorizationCallback));

    const contractDID = chargeSessionEndAuthorizationCallback.exchangeId.slice(0, -3);
    const vp = chargeSessionEndAuthorizationCallback.presentationSubmission?.vp.presentation;
    const chargingDataCredential = vp.verifiableCredential[0];

    const signedKwh = chargingDataCredential.credentialSubject.chargingData.kwh;

    const cpoBackendUrl = `${this.cpoBackendBaseUrl}/end-confirmation`;
    const cpoBackendRequestData = {
      contractDID,
      signedKwh,
    };

    try {
      const jwt = await this.getCpoBackendJwt();
      const result = await lastValueFrom(
        this.httpService.post(cpoBackendUrl, cpoBackendRequestData, { headers: { Authorization: `Bearer ${jwt}` } }).pipe(map((res) => res.data)),
      );
      this.logger.log('CPO-Backend response: ');
      this.logger.log(JSON.stringify(result));

      // set consumerEndConfirm attestation
      this.setAttestation(contractDID, this.consumerEndConfirm, 'ConsumerEndConfirmCredential');
    } catch (error) {
      this.logger.error('Error by sending end-confirmation to the CPO-Backend', error);
      throw new HttpException('Error by sending end-confirmation to the CPO-Backend', error.response?.status);
    }
  }

  async chargingStart(data: ChargingStartRequest): Promise<void> {
    let chargingContractDID;
    let sessionStartData;

    if (this.enableVCVP === 'true') {
      const expectedSigner = data.vp.proof.verificationMethod.replace('#controller', '');
      const vcs = await this.assetService.validateVerifiablePresentation(expectedSigner, data.vp);
      const offerConfirmCredential = vcs.find((vc) => vc.type.includes('OfferConfirmCredential'));
      const sessionDataCredential = vcs.find((vc) => vc.type.includes('SessionDataCredential'));

      if (
        offerConfirmCredential === undefined ||
        offerConfirmCredential.issuer !== this.ourDID ||
        offerConfirmCredential.credentialSubject['topic'] !== this.offerConfirm
      ) {
        this.logger.debug('Validation of VC failed');
        throw new ForbiddenException();
      }

      chargingContractDID = offerConfirmCredential.credentialSubject['id'];
      sessionStartData = sessionDataCredential.credentialSubject;
    } else {
      this.logger.log('Charging start');
      this.logger.log(JSON.stringify(data));

      chargingContractDID = data.contractDID;
      sessionStartData = data.session;
    }

    // store sessionStartData in IPFS & assign it to chargingContractDID
    this.createDataProperty(chargingContractDID, `sessionStartData`, sessionStartData);

    // set providerConfirm attestation
    this.setAttestation(chargingContractDID, this.providerConfirm, 'ProviderConfirmCredential');
  }

  async chargingUpdate(data: ChargingUpdateRequest): Promise<void> {
    const currentTimeStamp = new Date().toISOString();
    let chargingContractDID;
    let sessionUpdateData;

    if (this.enableVCVP === 'true') {
      const expectedSigner = data.vp.proof.verificationMethod.replace('#controller', '');
      const vcs = await this.assetService.validateVerifiablePresentation(expectedSigner, data.vp);
      const offerConfirmCredential = vcs.find((vc) => vc.type.includes('OfferConfirmCredential'));
      const sessionDataCredential = vcs.find((vc) => vc.type.includes('SessionDataCredential'));

      if (
        offerConfirmCredential === undefined ||
        offerConfirmCredential.issuer !== this.ourDID ||
        offerConfirmCredential.credentialSubject['topic'] !== this.offerConfirm
      ) {
        this.logger.debug('Validation of VC failed');
        throw new ForbiddenException();
      }

      chargingContractDID = offerConfirmCredential.credentialSubject['id'];
      sessionUpdateData = sessionDataCredential.credentialSubject;
    } else {
      this.logger.log('Charging update');
      this.logger.log(JSON.stringify(data));

      chargingContractDID = data.contractDID;
      sessionUpdateData = data.session;
    }

    // store sessionUpdateData in IPFS & assign it to chargingContractDID
    this.createDataProperty(chargingContractDID, `sessionUpdateData${currentTimeStamp}`, sessionUpdateData);

    // set providerUpdateChargeConfirm attestation
    this.setAttestation(chargingContractDID, this.providerUpdateChargeConfirm, 'ProviderUpdateChargeCredential');
  }

  async chargingEnd(data: ChargingEndRequest): Promise<void> {
    let chargingContractDID;
    const currentTimeStamp = new Date().toISOString();
    let sessionEndData;
    let chargeDetailRecord;

    if (this.enableVCVP === 'true') {
      const expectedSigner = data.vp.proof.verificationMethod.replace('#controller', '');
      const vcs = await this.assetService.validateVerifiablePresentation(expectedSigner, data.vp);
      const offerConfirmCredential = vcs.find((vc) => vc.type.includes('OfferConfirmCredential'));
      const sessionDataCredential = vcs.find((vc) => vc.type.includes('SessionDataCredential'));
      const chargeDetailRecordCredential = vcs.find((vc) => vc.type.includes('ChargeDetailRecordCredential'));

      if (
        offerConfirmCredential === undefined ||
        offerConfirmCredential.issuer !== this.ourDID ||
        offerConfirmCredential.credentialSubject['topic'] !== this.offerConfirm
      ) {
        this.logger.debug('Validation of VC failed');
        throw new ForbiddenException();
      }

      chargingContractDID = offerConfirmCredential.credentialSubject['id'];
      sessionEndData = sessionDataCredential.credentialSubject;
      chargeDetailRecord = chargeDetailRecordCredential.credentialSubject;
    } else {
      this.logger.log('Charging end data from CPO-Backend');
      this.logger.log(JSON.stringify(data));

      chargingContractDID = data.contractDID;
      sessionEndData = data.session;
      chargeDetailRecord = data.chargeDetailRecord;
    }

    const invoiceParams = [
      { id: 'sessionEndData', sessionEndData },
      { id: 'chargeDetailRecord', chargeDetailRecord },
    ];

    const invoiceJWT = await this.createJWTInvoice(invoiceParams);
    const invoiceVC = await this.createVCInvoice(invoiceParams);

    const energyWebUrl = this.energyWebBaseUrl + '/api/invoice';

    const energyWebRequestData = {
      invoiceJWT,
      invoiceVC,
    };

    let energyWebResponse;
    try {
      this.logger.log('Send verifiable invoices (VC+JWT) to Energy Web: ');
      energyWebResponse = await lastValueFrom(this.httpService.post(energyWebUrl, energyWebRequestData).pipe(map((res) => res.data)));
    } catch (error) {
      this.logger.error('Error by sending invoices to Energy Web', error);
      throw new HttpException('Error by sending invoices to Energy Web', error.response?.status);
    }

    this.logger.log('Generated VC Invoice:');
    this.logger.log(JSON.stringify(invoiceVC));

    this.logger.log('Generated JWT Invoice:');
    this.logger.log(JSON.stringify(invoiceJWT));

    // store VC invoice in IPFS & assign it to chargingContractDID
    this.createDataProperty(chargingContractDID, 'invoiceVC', invoiceVC);

    // store JWT invoice in IPFS & assign it to chargingContractDID
    this.createDataProperty(chargingContractDID, 'invoiceJWT', invoiceJWT);

    // set providerEndConfirm attestation
    this.setAttestation(chargingContractDID, this.providerEndConfirm, 'ProviderEndConfirmCredential');
  }

  public async getCpoBackendJwt(): Promise<string> {
    const url = `https://dev.ubstack.iao.fraunhofer.de/authentication/api/authenticate/apiKey?apiKey=${this.cpoBackendApiKey}`;
    this.logger.debug('Get JWT for CPO-Backend');

    try {
      const httpResult = await lastValueFrom(this.httpService.post(url).pipe(map((res) => res.data)));
      return httpResult.jwt;
    } catch (error) {
      this.logger.error('Error by requesting JWT from CPO-Backend', error);
      throw new HttpException('Error by sending authorization successful to the CPO-Backend', error.response?.status);
    }
  }

  public async setAttestation(contractDID: string, topic: string, credentialType: string) {
    const credentialSubject = {
      id: contractDID,
      topic,
    };

    const vc = await this.assetService.createVerifiableCredential([credentialType], credentialSubject);

    this.assetService.setAttestation(contractDID, topic, vc).then(
      () => this.logger.log(` attestation ${topic} has been set`),
      (err) => this.logger.error(`Catch error by set ${topic} attestation`, err),
    );

    return vc;
  }

  public async createDataProperty(contractDID: string, key: string, data: any) {
    const dataAsJsonString = JSON.stringify(data);
    this.assetService.createDataProperty(contractDID, key, dataAsJsonString, 'contractAsset').then(
      () => this.logger.debug(`${key} has been set to contract`),
      (err) => this.logger.error(`Catch error by set data property to contract`, err),
    );
  }

  public async createJWTInvoice(invoiceParams): Promise<string> {
    const jwtInvoiceUtil = new JWTVerifiableInvoiceUtilService({
      privateKey: this.accountPrivateKey,
      subject: 'verifiable_invoice',
      issuer: 'cpo-node',
    });

    return await jwtInvoiceUtil.create(invoiceParams);
  }

  public async createVCInvoice(invoiceParams): Promise<VerifiableCredential | string> {
    const vcInvoiceUtil = new VCVerifiableInvoiceUtilService({
      assetservice: this.assetService,
    });

    return await vcInvoiceUtil.create(invoiceParams);
  }
}
