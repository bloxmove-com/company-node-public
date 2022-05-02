import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@bloxmove-com/did-asset-library-core-obfuscated';

import { SettlementService } from './settlement.service';
import { IVehicleContractData, IUsageData } from '../common/interfaces/interfaces';

@Injectable()
export class DummySettlementService extends SettlementService {
  private readonly logger = new Logger(DummySettlementService.name);

  constructor(private config: ConfigService) {
    super();
  }

  public async registerForSettlement() {
    this.logger.log('SettlementService registerForSettlement called');
  }

  public async registerAsset(assetDID: string) {
    this.logger.log('SettlementService registerAsset called');
  }

  public async createAndStartAgreement(contractData: IVehicleContractData, contractDID: string): Promise<string> {
    this.logger.log('SettlementService createAndStartAgreement callled');
    if (!this.isSmartVinEnabled()) {
      return null;
    }
    return 'dummyAgreementId';
  }

  public async endAgreement(agreementId: string, usageData: IUsageData): Promise<void> {
    this.logger.log('SettlementService endAgreement callled');
    if (!this.isSmartVinEnabled()) {
      return;
    }
  }

  public async settleAgreement(agreementId: string): Promise<void> {
    this.logger.log('SettlementService settleAgreement callled');
    if (!this.isSmartVinEnabled()) {
      return;
    }
  }

  private isSmartVinEnabled(): boolean {
    return this.config.get('smartVin.enabled') === 'true';
  }
}
