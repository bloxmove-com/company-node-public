import { IVehicleContractData, IUsageData } from '../common/interfaces/interfaces';

export abstract class SettlementService {
  /**
   * Performs any necessary registration steps to make sure the operator of the fleet node
   * can participate in the settlement process.
   */
  public abstract registerForSettlement(): Promise<void>;

  /**
   * Registers a new asset in the settlement engine.
   * @param assetDID the DID of the asset
   */
  public abstract registerAsset(assetDID: string): Promise<void>;

  /**
   * Create an agreement pointing to the given contract data and DID.
   * @param {IVehicleContractData} contractData the contract data for the agreement
   * @param {string}          contractDID the DID of the contract
   *
   * @returns {Promise<string>} the agreement id
   */
  public abstract createAndStartAgreement(contractData: IVehicleContractData, contractDID: string): Promise<string>;

  /**
   * End the agreement with the given id considering the usage data.
   * @param {string}          agreementId the agreement id
   * @param {IUsageData}      usageData the usage data of the agreement
   *
   * @returns {Promise<void>}
   */
  public abstract endAgreement(agreementId: string, usageData: IUsageData): Promise<void>;

  /**
   * Settle the agreement with the given id.
   * @param {string}          agreementId the agreement id
   *
   * @returns {Promise<void>}
   */
  public abstract settleAgreement(agreementId: string): Promise<void>;
}
