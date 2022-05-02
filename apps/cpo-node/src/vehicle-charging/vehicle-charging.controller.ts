import { Controller, Body, Post } from '@nestjs/common';
import { VehicleChargingService } from './vehicle-charging.service';
import { ApiBody, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { AuthorizationRequest } from '../common/classes/authorization-request.class';
import { ChargingStartRequest } from '../common/classes/charging-start-request.class';
import { ChargingUpdateRequest } from '../common/classes/charging-update-request.class';
import { ChargingEndRequest } from '../common/classes/charging-end-request.class';
import { AuthorizationCallback } from '../common/classes/authorization-callback.class';
import { ContractDID } from '../common/classes/contract-did.class';
import { AuthorizationEndRequest } from '../common/classes/authorization-end-request.class';

@Controller('/')
export class VehicleChargingController {
  private readonly logger = new Logger(VehicleChargingController.name);
  constructor(private readonly vehicleChargingService: VehicleChargingService) {
    this.logger.log('APPVERSION: ', process.env.npm_package_version);
  }

  @Post('charge-session-authorize')
  @ApiBody({ type: AuthorizationRequest })
  @ApiTags('charging')
  @ApiOperation({ description: 'Receive the CPO-Backend request and trigger the authorization process to start the charge session' })
  @ApiCreatedResponse({ description: 'ok', type: ContractDID })
  async authorizeChargeSession(@Body() authorizationRequest: AuthorizationRequest): Promise<any> {
    return await this.vehicleChargingService.chargeSessionAuthorize(authorizationRequest);
  }

  @Post('charge-session-authorization-callback')
  @ApiOperation({ description: 'Receive the charge session start VP from the SSI-Wallet and validate it, inform the CPO-Backend if successful' })
  @ApiBody({ type: AuthorizationCallback })
  @ApiTags('charging')
  @ApiCreatedResponse({ description: 'ok' })
  async chargeAuthorizationCallback(@Body() chargeSessionAuthorizationCallback: AuthorizationCallback): Promise<void> {
    return await this.vehicleChargingService.handleChargeSessionAuthorizationCallback(chargeSessionAuthorizationCallback);
  }

  @Post('charge-end-session-authorize')
  @ApiBody({ type: AuthorizationEndRequest })
  @ApiTags('charging')
  @ApiOperation({ description: 'Receive the CPO-Backend request and trigger the authorization process to end the charge session' })
  @ApiCreatedResponse({ description: 'ok' })
  async authorizeEndSession(@Body() authorizationEndRequest: AuthorizationEndRequest): Promise<void> {
    return await this.vehicleChargingService.chargeEndSessionAuthorize(authorizationEndRequest);
  }

  @Post('charge-end-session-authorization-callback')
  @ApiOperation({ description: 'Receive the charge session end VP from the SSI-Wallet and validate it, inform the CPO-Backend if successful' })
  @ApiBody({ type: AuthorizationCallback })
  @ApiTags('charging')
  @ApiCreatedResponse({ description: 'ok' })
  async chargeEndAuthorizationCallback(@Body() chargeSessionEndAuthorizationCallback: AuthorizationCallback): Promise<void> {
    return this.vehicleChargingService.handleChargeEndSessionAuthorizationCallback(chargeSessionEndAuthorizationCallback);
  }

  @Post('charge-session-start')
  @ApiBody({ type: ChargingStartRequest })
  @ApiTags('charging')
  @ApiOperation({ description: 'Receive start session from the CPO-Backend and set charging-start attestation' })
  @ApiCreatedResponse({ description: 'ok' })
  async chargingStart(@Body() body: ChargingStartRequest): Promise<void> {
    return await this.vehicleChargingService.chargingStart(body);
  }

  @Post('charge-session-update')
  @ApiBody({ type: ChargingUpdateRequest })
  @ApiTags('charging')
  @ApiOperation({ description: 'Receive update sessions from the CPO-Backend' })
  @ApiCreatedResponse({ description: 'ok' })
  async chargingUpdate(@Body() body: ChargingUpdateRequest): Promise<void> {
    return await this.vehicleChargingService.chargingUpdate(body);
  }

  @Post('charge-session-end')
  @ApiBody({ type: ChargingEndRequest })
  @ApiTags('charging')
  @ApiOperation({ description: 'Receive the end session from the CPO-Backend and CDR, create verifiable invoice + set charging-end attestation' })
  @ApiCreatedResponse({ description: 'ok' })
  async chargingEnd(@Body() body: ChargingEndRequest): Promise<void> {
    return await this.vehicleChargingService.chargingEnd(body);
  }
}
