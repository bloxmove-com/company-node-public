import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VehicleRentalController } from './vehicle-rental.controller';
import { VehicleRentalService } from './vehicle-rental.service';
import { ConfigModule, UniversalAssetServiceModule } from '@bloxmove-com/did-asset-library-nestjs-obfuscated';
import { BloxmoveTompGatewayService } from '../tomp/bloxmove-tomp-gateway.service';
import { SettlementModule } from '../settlement/settlement.module';
import { RentalHelperService } from './rental-helper/rental-helper.service';
import { BackfillHttpService } from './backfill-http/backfill-http.service';
import { FleetBackendModule } from '../fleet-backend/fleet-backend.module';

@Module({
  imports: [ConfigModule, UniversalAssetServiceModule, FleetBackendModule, HttpModule, SettlementModule],
  controllers: [VehicleRentalController],
  providers: [VehicleRentalService, BloxmoveTompGatewayService, RentalHelperService, BackfillHttpService],
})
export class VehicleRentalModule {}
