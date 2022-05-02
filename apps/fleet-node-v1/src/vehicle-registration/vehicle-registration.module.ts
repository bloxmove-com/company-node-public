import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, UniversalAssetServiceModule } from '@bloxmove-com/did-asset-library-nestjs-obfuscated';
import { VehicleRegistrationService } from './vehicle-registration.service';
import { VehicleRegistrationController } from './vehicle-registration.controller';
import { SettlementModule } from '../settlement/settlement.module';

@Module({
  imports: [ConfigModule, UniversalAssetServiceModule, HttpModule, SettlementModule],
  controllers: [VehicleRegistrationController],
  providers: [VehicleRegistrationService],
})
export class VehicleRegistrationModule {}
