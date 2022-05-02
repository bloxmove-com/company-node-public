import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VehicleRentalModule } from './vehicle-rental/vehicle-rental.module';
import { FleetBackendModule } from './fleet-backend/fleet-backend.module';
import { VehicleRegistrationModule } from './vehicle-registration/vehicle-registration.module';
import { SettlementModule } from './settlement/settlement.module';
import { ConfigModule } from '@bloxmove-com/did-asset-library-nestjs-obfuscated';

@Module({
  imports: [ConfigModule, VehicleRentalModule, FleetBackendModule, VehicleRegistrationModule, SettlementModule, ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
