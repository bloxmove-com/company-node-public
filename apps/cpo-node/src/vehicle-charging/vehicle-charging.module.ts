import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VehicleChargingController } from './vehicle-charging.controller';
import { VehicleChargingService } from './vehicle-charging.service';
import { ConfigModule, UniversalAssetServiceModule } from '@bloxmove-com/did-asset-library-nestjs-obfuscated';
import { ChargingHelperService } from './charging-helper/charging-helper.service';

@Module({
  imports: [ConfigModule, UniversalAssetServiceModule, HttpModule],
  controllers: [VehicleChargingController],
  providers: [VehicleChargingService, ChargingHelperService],
})
export class VehicleChargingModule {}
