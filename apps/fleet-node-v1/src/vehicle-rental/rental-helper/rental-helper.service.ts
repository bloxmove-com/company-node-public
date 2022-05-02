import { Logger, NotFoundException, HttpException, ForbiddenException, BadRequestException, Injectable } from '@nestjs/common';
import {
  AssetService,
  ConfigService,
  VerifiableCredential,
  InvalidDIDSyntaxException,
  UnresolvableDIDException,
} from '@bloxmove-com/did-asset-library-core-obfuscated';
import { IVehicleContractData } from '../../common/interfaces/interfaces';
import { ConsumerTopicsAttestationFailedException } from '../../common/exceptions/consumer-topics-attestation-failed.exception';
import { FlowWrongStatus } from '../../common/exceptions/flow-wrong-status.exception';
import { InvalidAccessToken } from '../../common/exceptions/invalid-access-token.exception';
import * as b64 from 'js-base64';

@Injectable()
export class RentalHelperService {
  private readonly logger = new Logger(RentalHelperService.name);

  private readonly ourDID;
  private readonly apiType;

  readonly offerConfirm = '/offerConfirm';
  readonly consumerConfirm = '/consumerConfirm';
  readonly providerConfirm = '/providerConfirm';
  readonly consumerAccessTokenRequest = '/consumerAccessTokenRequest';
  readonly consumerEndRequest = '/consumerEndRequest';
  readonly providerEndConfirm = '/providerEndConfirm';
  readonly consumerEndConfirm = '/consumerEndConfirm';

  constructor(private readonly config: ConfigService, private readonly assetService: AssetService) {
    this.ourDID = this.config.getOrThrow('accountDID');
    this.apiType = this.config.get('apiType');
  }

  // Check the pre condition of each status of the rental Flow
  public async checkFlowStatus(assetDID: string, status: string, consumerDID?: string) {
    let usageData: string;
    let attestationExists: boolean;
    switch (status) {
      case 'endRental':
        usageData = await this.getDataPropertyFromContract(assetDID, 'usageData', 'contractAsset');
        attestationExists = await this.checkIfAttestationExist(assetDID, this.providerConfirm, this.ourDID);
        if (usageData || !attestationExists) {
          throw new FlowWrongStatus(status);
        }
        break;
      case 'accessToken':
        usageData = await this.getDataPropertyFromContract(assetDID, 'usageData', 'contractAsset');
        if (usageData) {
          throw new FlowWrongStatus(status);
        }
        break;
      case 'completeStart':
        usageData = await this.getDataPropertyFromContract(assetDID, 'usageData', 'contractAsset');
        attestationExists = await this.checkIfAttestationExist(assetDID, this.providerEndConfirm, this.ourDID);
        if (usageData || attestationExists) {
          throw new FlowWrongStatus(status);
        }
        break;
      case 'completeEnd':
        attestationExists = await this.checkIfAttestationExist(assetDID, this.consumerEndConfirm, consumerDID);
        if (attestationExists) {
          throw new FlowWrongStatus(status);
        }
      default:
        break;
    }
  }

  public async checkConsumerVerifiableCredentials(contractData: IVehicleContractData, consumerVCs: VerifiableCredential[]) {
    this.logger.debug(`Check if consumer ${contractData.consumerDID} has valid VCs with claims
    ${JSON.stringify(contractData.requiredUserClaims) + ', ' + contractData.requiredBusinessClaims}`);
    this.logger.debug('VCs: ' + JSON.stringify(consumerVCs));
    const trustedIssuers: string[] = this.config.get('kycIssuers').split(',');
    const userClaims = contractData.requiredUserClaims;
    const businessClaims = contractData.requiredBusinessClaims;
    let isBusinessClaimsValid = businessClaims && businessClaims.length !== 0;
    let isUserClaimsValid = userClaims && userClaims.length !== 0;

    switch (true) {
      case isUserClaimsValid && !isBusinessClaimsValid:
        for (const topic of userClaims) {
          const vcType = topic.charAt(0).toUpperCase() + topic.slice(1) + 'Type';
          const isValid = consumerVCs.some((vc) => {
            const issuer = typeof vc.issuer === 'object' ? vc.issuer.id : vc.issuer;
            return (
              vc.type.includes(vcType) &&
              vc.credentialSubject['id'] === contractData.consumerDID &&
              trustedIssuers.includes(issuer) &&
              vc.credentialSubject[topic] === true
            );
          });
          this.logger.debug(`The consumer fulfills the topic ${topic}: ${isValid ? 'YES' : 'NO'}`);
          if (!isValid) {
            isUserClaimsValid = false;
          }
        }
        break;
      case isBusinessClaimsValid && !isUserClaimsValid:
        for (const topic of businessClaims) {
          const vcType = 'CompanyCredential';
          const isValid = consumerVCs.some((vc) => {
            const issuer = typeof vc.issuer === 'object' ? vc.issuer.id : vc.issuer;
            return (
              vc.type.includes(vcType) &&
              vc.credentialSubject['id'] === contractData.consumerDID &&
              trustedIssuers.includes(issuer) &&
              vc.credentialSubject[topic] === true
            );
          });
          this.logger.debug(`The company fulfills the topic ${topic}: ${isValid ? 'YES' : 'NO'}`);
          if (!isValid) {
            isUserClaimsValid = false;
          }
        }
        break;
      case isUserClaimsValid && isBusinessClaimsValid:
        for (const topic of userClaims) {
          const vcType = topic.charAt(0).toUpperCase() + topic.slice(1) + 'Type';
          const isValid = consumerVCs.some((vc) => {
            const issuer = typeof vc.issuer === 'object' ? vc.issuer.id : vc.issuer;
            return (
              vc.type.includes(vcType) &&
              vc.credentialSubject['id'] === contractData.consumerDID &&
              trustedIssuers.includes(issuer) &&
              vc.credentialSubject[topic] === true
            );
          });
          this.logger.debug(`The consumer fulfills the topic ${topic}: ${isValid ? 'YES' : 'NO'}`);
          if (!isValid) {
            isUserClaimsValid = false;
          }
        }
        for (const topic of businessClaims) {
          const vcType = 'CompanyCredential';
          const isValid = consumerVCs.some((vc) => {
            const issuer = typeof vc.issuer === 'object' ? vc.issuer.id : vc.issuer;
            return (
              vc.type.includes(vcType) &&
              vc.credentialSubject['id'] === contractData.consumerDID &&
              trustedIssuers.includes(issuer) &&
              vc.credentialSubject[topic] === true
            );
          });
          this.logger.debug(`The company fulfills the topic ${topic}: ${isValid ? 'YES' : 'NO'}`);
          if (!isValid) {
            isUserClaimsValid = false;
          }
        }
        break;
      default:
        isUserClaimsValid = false;
        isBusinessClaimsValid = false;
        break;
    }
    if (isUserClaimsValid || isBusinessClaimsValid) {
      return;
    }
    throw new ConsumerTopicsAttestationFailedException(contractData.consumerDID, `the VC has not the expected data`);
  }

  public async verifyVerifiableCredentialChain(
    verifiableCredentials: VerifiableCredential[],
    expectedSignerDID: string,
  ): Promise<VerifiableCredential> {
    this.logger.debug(`expected signer of VerifiableCredential: ${expectedSignerDID}`);
    const credentialType = 'VehicleAccessCredential';
    if (!verifiableCredentials[0].type.includes(credentialType)) {
      this.logger.error(`VerifiableCredential is not of type: '${credentialType}'`);
      throw new InvalidAccessToken();
    }
    this.logger.debug(`VerifiableCredential is issued by: ${verifiableCredentials[0].issuer}`);
    this.verifyExpirationDate(verifiableCredentials[0]);
    if (verifiableCredentials.length === 1) {
      return verifiableCredentials[0];
    }
    const nextSigner = verifiableCredentials[0].credentialSubject['id'];
    return await this.verifyVerifiableCredentialChain(verifiableCredentials.slice(1), nextSigner);
  }

  private async checkIfAttestationExist(assetDID: string, topic: string, issuerDID: string): Promise<boolean> {
    const attestations: Array<VerifiableCredential | string> = await this.assetService.getAttestations(assetDID, topic);
    for (const entry of attestations) {
      const validatedVC = await this.assetService.validateVerifiableCredential(entry);
      if (validatedVC) {
        const issuer = typeof validatedVC.issuer === 'object' ? validatedVC.issuer.id : validatedVC.issuer;
        if (issuer === issuerDID) {
          return true;
        }
      }
    }
    return false;
  }

  private verifyExpirationDate(verifiableCredential: VerifiableCredential) {
    this.logger.debug(`VerifiableCredential expires at: ${verifiableCredential.expirationDate}`);
    // date is treated as string here
    if (new Date(verifiableCredential.expirationDate).getTime() < Date.now()) {
      this.logger.error(`accessToken expired`);
      throw new InvalidAccessToken();
    }
  }

  public async waitForVerification(assetDID: string, topic: string, issuerDID: string): Promise<void> {
    this.logger.debug(`Waiting for the attestation ${topic} on ${assetDID} issued by ${issuerDID}`);
    let i = 0;
    while (i <= 100) {
      const verificationExist = await this.checkIfAttestationExist(assetDID, topic, issuerDID);
      if (verificationExist) {
        return;
      }
      await this.sleep(100);
      i++;
    }
    if (i > 100) {
      throw new HttpException(`Error: required attestation ${topic} issued by ${issuerDID} doesn't exist.`, 423);
    }
  }

  public async getDataPropertyFromContract(contractDID: string, key: string, assetType: string): Promise<any> {
    const contractDataAsString = await this.assetService.getDataProperty(contractDID, key, assetType);
    if (contractDataAsString) {
      return JSON.parse(contractDataAsString);
    }
    return;
  }

  public async waitForDataPropertyInContractAsset(assetDID: string, key: string): Promise<any> {
    this.logger.debug(`Waiting for DataProperty ${key} from ${assetDID}`);
    let i = 0;
    while (i <= 100) {
      const value = await this.getDataPropertyFromContract(assetDID, key, 'contractAsset');
      if (value) {
        return value;
      }
      await this.sleep(100);
      i++;
    }
    if (i > 100) {
      throw new NotFoundException('Timeout: The data has not been written yet!');
    }
  }

  public async isOwnerOf(expectedOwnerDID: string, assetDID: string): Promise<boolean> {
    try {
      const actualOwnerDID = await this.assetService.getOwner(assetDID);
      this.logger.debug(actualOwnerDID + ' is the owner of ' + assetDID);
      return expectedOwnerDID === actualOwnerDID;
    } catch (err) {
      switch (true) {
        case err instanceof InvalidDIDSyntaxException:
          throw new BadRequestException(err.message);
        case err instanceof UnresolvableDIDException:
          throw new NotFoundException(err.message);
        default:
          throw new Error('Unexpected error requesting the owner of the given asset DID');
      }
    }
  }

  public async verifyInvolvementAndGetReferencedContractDID(ourDID: string, contractDID: string): Promise<string> {
    this.logger.debug(`Vehicle is owned by other provider. Verifying involvement and looking for contractDID of a referencedContract.`);
    const referencedContracts: string[] = await this.getDataPropertyFromContract(contractDID, 'referencedContracts', 'contractAsset');
    this.logger.debug(`The referencedContracts data: ${JSON.stringify(referencedContracts)}`);
    if (!referencedContracts || referencedContracts.length === 0) {
      // 422 Unprocessable Entity
      throw new HttpException('Vehicle is owned by other provider. Contract cannot be processed due to missing reference', 422);
    }
    this.logger.log('The assetContract has referenced Contracts');
    const backfillContractDID = referencedContracts[0];
    const backfillContractData = await this.getDataPropertyFromContract(backfillContractDID, 'contractData', 'contractAsset');
    if (backfillContractData.consumerDID !== ourDID) {
      // 422 Unprocessable Entity
      throw new HttpException(`Vehicle is owned by other provider. We cannot process the request as we aren't involved in the given contract.`, 422);
    }
    return backfillContractDID;
  }

  public async getContractData(contractDID) {
    let contractData: IVehicleContractData;

    const myContract = await this.isOwnerOf(this.ourDID, contractDID);
    if (!myContract) {
      throw new ForbiddenException('The provided Contract DID ' + contractDID + ' is owned by another service provider');
    }

    try {
      contractData = await this.getDataPropertyFromContract(contractDID, 'contractData', 'contractAsset');
    } catch (err) {
      throw new Error('An unexpected error occured while getting the contract data');
    }
    return contractData;
  }

  private sleep(milliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  public async checkIsMyVehicle(vehicleDID: string) {
    if (this.apiType === 'tomp') {
      // in tomp-case always true, reselling scenarios not supported for tomp apiType
      return true;
    }
    return this.isOwnerOf(this.ourDID, vehicleDID);
  }
}
