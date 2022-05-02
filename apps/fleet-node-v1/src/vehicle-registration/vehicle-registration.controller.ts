import { Controller, Body, Post, UseGuards, Get, Param, Put } from '@nestjs/common';
import {
  ApiBody,
  ApiSecurity,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { IVehicleRegistration, IVehicleDID, IVehicleDetails } from '../common/interfaces/interfaces';
import { VehicleRegistrationService } from './vehicle-registration.service';
import { VehicleDID } from '../common/classes/vehicle-did.class';
import { VehicleRegistration } from '../common/classes/vehicle-registration.class';
import { VehicleDetails } from '../common/classes/vehicle-details.class';

@Controller('/vehicle-assets')
export class VehicleRegistrationController {
  private readonly logger = new Logger(VehicleRegistrationController.name);
  constructor(private readonly vehicleRegistrationService: VehicleRegistrationService) {}

  @Post('/')
  @ApiSecurity('apiKey')
  @UseGuards(ApiKeyGuard)
  @ApiBody({ type: VehicleRegistration })
  @ApiOperation({ description: 'Create and register a new vehicle asset' })
  @ApiCreatedResponse({ description: 'the vehicle asset has been successfully created and registered', type: VehicleDID })
  @ApiUnauthorizedResponse({ description: 'invalid or missing apiKey' })
  @ApiConflictResponse({ description: 'vehicle asset already exists' })
  @ApiBadRequestResponse({ description: 'wrong or missing properties in request body' })
  async createVehicleAssetRequest(@Body() vehicleRegistration: IVehicleRegistration): Promise<IVehicleDID> {
    this.logger.log(`Create vehicle asset Request:  ${JSON.stringify(vehicleRegistration)}`);
    const assetDID = await this.vehicleRegistrationService.createDataAsset(vehicleRegistration);
    return { vehicleDID: assetDID };
  }

  @Put('/:vin')
  @ApiSecurity('apiKey')
  @UseGuards(ApiKeyGuard)
  @ApiBody({ type: VehicleDetails })
  @ApiOperation({ description: 'Create and register a new vehicle asset' })
  @ApiCreatedResponse({ description: 'the vehicle asset has been successfully updated', type: VehicleDID })
  @ApiUnauthorizedResponse({ description: 'invalid or missing apiKey' })
  @ApiBadRequestResponse({ description: 'wrong or missing properties in request body' })
  async updateCar(@Param('vin') vin: string, @Body() vehicleDetails: VehicleDetails): Promise<void> {
    this.logger.log(`Update vehicle asset Request:  ${JSON.stringify(vehicleDetails)}`);
    await this.vehicleRegistrationService.updateTelematicsBox(vin, vehicleDetails);
  }

  @Get('/:vin')
  @ApiSecurity('apiKey')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ description: 'Get vehicle asset' })
  @ApiOkResponse({ description: 'the vehicle asset details has been fetched successfully' })
  @ApiUnauthorizedResponse({ description: 'invalid or missing apiKey' })
  async getVehicleAsset(@Param('vin') vin: string): Promise<IVehicleDetails> {
    this.logger.log(`Get vehicle asset:  ${JSON.stringify(vin)}`);
    const vehicleDetails = await this.vehicleRegistrationService.getDataAsset(vin);
    return vehicleDetails;
  }
}
