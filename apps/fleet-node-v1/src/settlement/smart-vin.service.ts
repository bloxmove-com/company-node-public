import { Injectable, Logger } from '@nestjs/common';
import { AssetService, ConfigService } from '@bloxmove-com/did-asset-library-core-obfuscated';
import rp = require('request-promise');
import { SettlementService } from './settlement.service';
import { IVehicleContractData, IUsageData } from '../common/interfaces/interfaces';

@Injectable()
export class SmartVinService extends SettlementService {
  private readonly logger = new Logger(SmartVinService.name);

  constructor(private config: ConfigService, private assetService: AssetService) {
    super();
  }

  public async registerForSettlement(): Promise<void> {
    if (!this.isSmartVinEnabled()) {
      return;
    }
    // make sure own corda id is set as "alsoKnownAs" alias in DID document of owning account
    const ownCordaIdentity = await this.getCordaIdentity(this.config.get('accountDID'));
    if (ownCordaIdentity !== this.config.get('smartVin.ownIdentity')) {
      await this.setOwnCordaIdentityToDIDDocument();
    }
  }

  public async registerAsset(assetDID: string): Promise<void> {
    if (!this.isSmartVinEnabled()) {
      return;
    }
    const vin = await this.getVinFromVehicleDID(assetDID);
    const options: any = await this.createIssueVehicleOptions();
    options.body = await this.createRegisterVehicleRequest(vin);
    this.logger.log('request issue vehicle with VIN ' + vin);
    try {
      await rp(options);
    } catch (error) {
      this.logger.error('Error issuing vehicle', error);
      throw new Error('Problem occured while issuing vehicle in smartVIN');
    }
  }

  public async createAndStartAgreement(contractData: IVehicleContractData, contractDID: string): Promise<string> {
    if (!this.isSmartVinEnabled()) {
      return null;
    }
    const vin = await this.getVinFromVehicleDID(contractData.vehicleDID);
    const agreementId = await this.postAgreement(vin, contractData, contractDID);
    this.calculateLiabilityAndTransferPossession(vin, await this.getCordaIdentity(contractData.consumerDID), agreementId).catch((error) =>
      this.logger.error('Error calculating liability and transferring possession', error),
    );
    return agreementId;
  }

  public async endAgreement(agreementId: string, usageData: IUsageData): Promise<void> {
    if (!this.isSmartVinEnabled()) {
      return;
    }
    const liabilities = await this.calculateLiabilitiesForEnd(agreementId, usageData);
    const vehicle = await this.transferVehiclePossessionToFleetOwner(agreementId, liabilities);
    this.logger.debug('Vehicle transferred back');
    this.logger.debug(vehicle);
  }

  public async settleAgreement(agreementId: string): Promise<void> {
    if (!this.isSmartVinEnabled()) {
      return;
    }
    const cashTransfers = await this.settleLiabilities(agreementId);
    this.logger.debug('Cash transferred');
    this.logger.debug(cashTransfers);
  }

  private async getVinFromVehicleDID(vehicleDID): Promise<string> {
    this.logger.debug('Get the vin from the vehicle DID');
    try {
      return await this.assetService.getDataProperty(vehicleDID, 'vin');
    } catch (err) {
      this.logger.debug(`error getting vin for vehicle: ${vehicleDID}`);
      throw new Error(`invalid vehicleDID: ${vehicleDID}`);
    }
  }

  private isSmartVinEnabled(): boolean {
    return this.config.get('smartVin.enabled') === 'true';
  }

  private async postAgreement(vin: string, contractData: any, contractDID: string) {
    const options: any = await this.createPostAgreementOptions();
    options.body = await this.createAgreement(vin, contractData, contractDID);
    this.logger.log('created agreement to issue:');
    this.logger.log(options.body);
    try {
      this.logger.log(`creating an agreement for vin ${vin}`);
      const agreementIdentifier = await rp(options);
      this.logger.log(`created an agreement with id: ${agreementIdentifier.id}`);
      return agreementIdentifier.id;
    } catch (error) {
      this.logger.error(error.message);
      throw new Error('Problem occurred creating agreement in smartVIN');
    }
  }

  /**
   * Calls smartVIN to create liabilities and start VehiclePossessionTransferFlow.
   *
   * @param {*} vin
   * @param {*} agreementId
   */
  private async calculateLiabilityAndTransferPossession(vin, consumerDID, agreementId) {
    const liabilities = await this.calculateLiabilitiesForStart(agreementId);
    const vehicle = await this.transferVehiclePossessionToConsumer(vin, consumerDID, agreementId, liabilities);
    this.logger.log('Transferred vehicle:', vehicle);
  }

  private async calculateLiabilitiesForStart(agreementId: string) {
    const payload = await this.createPayloadForStart(agreementId);
    const options: any = await this.createConsumeAgreementOptions(agreementId);
    options.body = payload;
    this.logger.log('consume agreement request:');
    this.logger.log(options.body);
    try {
      const liabilities = await rp(options);
      return liabilities;
    } catch (error) {
      this.logger.error(error.message);
      throw new Error('Problem occured while consuming agreement in smartVIN');
    }
  }

  private async calculateLiabilitiesForEnd(agreementId: string, usageData: any) {
    const payload = await this.createPayloadForEnd(agreementId, usageData);
    const options: any = await this.createConsumeAgreementOptions(agreementId);
    options.body = payload;
    try {
      const liabilities = await rp(options);
      return liabilities;
    } catch (error) {
      this.logger.error(error.message);
      throw new Error('Problem occured while consuming agreement in smartVIN');
    }
  }

  private async transferVehiclePossession(vin: string, agreementId: string, liabilities: any, from: any, to: any) {
    const options: any = await this.createPossessionTransferOptions(vin);
    options.body = await this.createPossessionTransferRequest(vin, agreementId, liabilities, from, to);
    this.logger.log('possession request');
    this.logger.log(options.body);
    try {
      return await rp(options);
    } catch (error) {
      this.logger.error('error during vehicle possession transfer', error);
      throw new Error('Problem occured while transfering vehicle possession in smartVIN');
    }
  }

  /**
   * Calls smartVIN to start the VehiclePossessionTransferFlow. This will transfer the possession of the vehicle to the consumer.
   *
   * @param {string} vin
   * @param {string} agreementId
   * @param {List} liabilites
   */
  private async transferVehiclePossessionToConsumer(vin: string, consumerDID: string, agreementId: string, liabilites: any) {
    return await this.transferVehiclePossession(vin, agreementId, liabilites, this.config.get('smartVin.ownIdentity'), consumerDID);
  }

  /**
   * Calls smartVIN to start the VehiclePossessionTransferFlow. This will transfer the possession of the vehicle back to the fleet owner.
   *
   * @param {string} agreementId
   * @param {List} liabilites
   */
  private async transferVehiclePossessionToFleetOwner(agreementId: string, liabilities: any) {
    const agreement = await rp(await this.createGetAgreementOptions(agreementId));
    return await this.transferVehiclePossession(agreement.vin, agreementId, liabilities, liabilities[0].from, liabilities[0].to);
  }

  /**
   * searches for the proper liability and settles it via shadow cash.
   */
  private async settleLiabilities(agreementId: string) {
    const agreement = await rp(await this.createGetAgreementOptions(agreementId));
    const provider = agreement.parties[0].accountId.node;
    const consumer = agreement.parties[1].accountId.node;
    this.logger.log('Settling liabilities from ' + consumer + ' to ' + provider + ' for agreement ' + agreementId);
    const liabilities = await this.getUnpaidLiabilities(consumer, provider, agreementId);
    const amount = await this.calculateTotalAmountToSettle(liabilities);
    this.logger.log(`issueing ${amount} amount of cash`);
    await this.issueCash(amount, consumer);
    this.logger.log('paying liabilities:');
    this.logger.log(liabilities);
    const cashTransfers = await this.payLiabilities(liabilities);
    return cashTransfers;
  }

  private async calculateTotalAmountToSettle(liabilities: any) {
    let totalAmount = 0;
    for (const liability of liabilities) {
      totalAmount += this.getAmountNumberFromString(liability.unpaidAmount);
    }
    return totalAmount;
  }

  private async payLiabilities(liabilities: any) {
    const paymentOperations = [];
    for (const liability of liabilities) {
      paymentOperations.push(this.payLiability(liability));
    }
    return await Promise.all(paymentOperations);
  }

  private async payLiability(liability: any) {
    const options: any = await this.createPayLiabilityOptions(liability.linearId);
    options.body = await this.createPaymentRequest(this.getAmountNumberFromString(liability.unpaidAmount));
    try {
      const cashTransfer = await rp(options);
      return cashTransfer;
    } catch (error) {
      this.logger.error(error.message);
      throw new Error(`problem paying liability in smartVIN with id: ${liability.linearId}`);
    }
  }

  private async issueCash(amount: any, issueTo: string) {
    const options: any = await this.createIssueCashOptions();
    options.body = await this.createIssueCashRequest(amount, issueTo);
    this.logger.log('issue cash request:');
    this.logger.log(options.body);
    try {
      await rp(options);
    } catch (error) {
      this.logger.error(error.message);
      throw new Error('problem issueing shadow cash in smartVIN');
    }
  }

  private async createIssueCashRequest(amount: any, issueTo: string) {
    return {
      issuer: this.config.get('smartVin.ownIdentity'),
      issueTo,
      amount,
      currencyCode: 'EUR',
      externalTxId: 'tx123',
    };
  }

  private async createPaymentRequest(finalPrice: any) {
    return {
      amount: finalPrice,
      currencyCode: 'EUR',
      paymentType: 'EFT',
      externalTxId: '123',
    };
  }

  private async createRegisterVehicleRequest(vin: string) {
    return {
      VIN: vin,
      owner: this.config.get('smartVin.ownIdentity'),
    };
  }

  private async getUnpaidLiabilities(from: any, to: any, agreementId: string) {
    const options: any = await this.createGetLiabilitiesOptions(from, to);
    try {
      const liabilities = await rp(options);
      this.logger.log(`found ${liabilities.length} liabilites`);
      const unpaidLiabilities = await this.getUnpaidLiabilitiesForAgreement(liabilities, agreementId);
      return unpaidLiabilities;
    } catch (error) {
      this.logger.error(error.message);
      throw new Error('error getting liabilities from smartVIN');
    }
  }

  private async getUnpaidLiabilitiesForAgreement(liabilities: any, agreementId: string) {
    const result = [];
    for (const liability of liabilities) {
      if (this.getAmountNumberFromString(liability.unpaidAmount) !== 0 && liability.context.linearId.id === agreementId) {
        result.push(liability);
      }
    }
    return result;
  }

  private getAmountNumberFromString(amountString: string) {
    return Number(amountString.split(' ')[0]);
  }

  private async createPossessionTransferRequest(vin: string, agreementId: string, liabilites: any, from: any, to: any) {
    return {
      VIN: vin,
      transferFrom: from,
      transferTo: to,
      currencyCode: 'EUR',
      agreement: {
        id: agreementId,
        type: 'external',
      },
      finalized: false,
      liabilities: liabilites,
    };
  }

  private async createPossessionTransferOptions(vin: string) {
    const options = {
      method: 'POST',
      json: true,
      url: this.config.get('smartVin.url.transferVehiclePossession').replace(':vin', vin),
    };
    return options;
  }

  private async createAgreement(vin: string, contractData: any, contractDID: string) {
    return {
      type: 'external',
      externalID: contractDID,
      parties: [this.config.get('smartVin.ownIdentity'), await this.getCordaIdentity(contractData.consumerDID)],
      vin,
      contractData,
    };
  }

  private async createPayloadForStart(agreementId: string) {
    return {
      payload: {
        type: 'external',
        finalPrice: {
          amount: 0,
          symbol: 'EUR',
        },
        usageData: {},
      },
      id: agreementId,
    };
  }

  private async createPayloadForEnd(agreementId: string, usageData: any) {
    return {
      payload: {
        type: 'external',
        finalPrice: {
          amount: usageData.finalPrice,
          symbol: 'EUR',
        },
        usageData,
      },
      id: agreementId,
    };
  }

  private async createGetAgreementOptions(agreementId: string) {
    const options = {
      method: 'GET',
      json: true,
      url: this.config.get('smartVin.url.getAgreement').replace(':agreementId', agreementId).replace(':type', 'external'),
    };
    return options;
  }

  private async createConsumeAgreementOptions(agreementId: string) {
    const options = {
      method: 'POST',
      json: true,
      url: this.config.get('smartVin.url.consumeAgreement').replace(':agreementId', agreementId),
    };
    return options;
  }

  private async createPostAgreementOptions() {
    const options = {
      method: 'POST',
      json: true,
      url: this.config.get('smartVin.url.createAgreement'),
    };
    return options;
  }

  private async createGetLiabilitiesOptions(from: any, to: any) {
    this.logger.log('url:');
    this.logger.log(`${this.config.get('smartVin.url.getLiabilities')}?from=${from}&to=${to}`);
    const options = {
      method: 'GET',
      json: true,
      url: `${this.config.get('smartVin.url.getLiabilities')}?from=${from}&to=${to}`,
    };
    return options;
  }

  private async createPayLiabilityOptions(liabilityId: string) {
    const options = {
      method: 'POST',
      json: true,
      url: this.config.get('smartVin.url.payLiability').replace(':liabilityId', liabilityId),
    };
    return options;
  }

  private async createIssueCashOptions() {
    const options = {
      method: 'POST',
      json: true,
      url: this.config.get('smartVin.url.issueCash'),
    };
    return options;
  }

  private async createIssueVehicleOptions() {
    const options = {
      method: 'POST',
      json: true,
      url: this.config.get('smartVin.url.issueVehicle'),
    };
    return options;
  }

  private async getCordaIdentity(did: string) {
    // must convert to any type because DID document interface does not include optional "alsoKnownAs" property
    const didDocument: any = await this.assetService.getDIDDocument(did);
    if (didDocument && didDocument.alsoKnownAs) {
      const cordaIdUri = didDocument.alsoKnownAs.find((uri) => uri.startsWith('corda:'));
      if (cordaIdUri) {
        return cordaIdUri.substring('corda:'.length);
      }
    }
    // if no corda identifier set, return the DID itself
    return did;
  }

  private async setOwnCordaIdentityToDIDDocument() {
    const ownDid = this.config.get('accountDID');
    const ownCordaId = this.config.get('smartVin.ownIdentity');
    this.logger.log('Setting corda id ' + ownCordaId + ' to DID document of ' + ownDid);
    const didDocument: any = await this.assetService.getDIDDocument(ownDid);
    didDocument.alsoKnownAs = ['corda:' + ownCordaId];
    await this.assetService.setDIDDocument(didDocument);
  }
}
