import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FleetBackendController } from './fleet-backend.controller';
import { FleetBackendService } from './fleet-backend.service';
import { ConfigModule, UniversalAssetServiceModule } from '@bloxmove-com/did-asset-library-nestjs-obfuscated';
import { BloxmoveTompGatewayService } from '../tomp/bloxmove-tomp-gateway.service';

@Module({
  imports: [ConfigModule, UniversalAssetServiceModule, HttpModule],
  controllers: [FleetBackendController],
  providers: [FleetBackendService, BloxmoveTompGatewayService],
  exports: [FleetBackendService],
})
export class FleetBackendModule {}
