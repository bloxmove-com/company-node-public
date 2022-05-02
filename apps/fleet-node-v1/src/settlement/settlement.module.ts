import { Module } from '@nestjs/common';
import { ConfigModule, UniversalAssetServiceModule } from '@bloxmove-com/did-asset-library-nestjs-obfuscated';
import { SmartVinService } from './smart-vin.service';
import { SettlementService } from './settlement.service';

@Module({
  imports: [ConfigModule, UniversalAssetServiceModule],
  providers: [
    {
      provide: SettlementService,
      useClass: SmartVinService,
    },
  ],
  exports: [SettlementService],
})
export class SettlementModule {}
