import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SettlementModule } from './settlement/settlement.module';
import { ConfigModule } from '@bloxmove-com/did-asset-library-nestjs-obfuscated';
import { VehicleChargingModule } from './vehicle-charging/vehicle-charging.module';

@Module({
  imports: [ConfigModule, VehicleChargingModule, SettlementModule, ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
