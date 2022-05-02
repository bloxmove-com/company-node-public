import { Controller, Body, Post, Get, Param, Headers, Put } from '@nestjs/common';
import { VehicleRentalService } from './vehicle-rental.service';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiResponse,
  ApiOperation,
  ApiHeader,
} from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { RentalRequest } from '../common/classes/rental-request.class';
import { ContractDID } from '../common/classes/contract-did.class';
import { RentalConfirmation } from '../common/classes/rental-confirmation.class';
import { RentalEndRequest } from '../common/classes/rental-end-request.class';
import { UsageData } from '../common/classes/usage-data.class';
import { IContractDID, IUsageData, IAccessTokenResponse, IDoorStatusUpdateRequest } from '../common/interfaces/interfaces';
import { AccessTokenResponse } from '../common/classes/access-token-response.class';
import { DoorStatusUpdateRequest } from '../common/classes/door-status-update-request.class';
import { VerifiableCredential, VerifiablePresentation } from '@bloxmove-com/did-asset-library-core-obfuscated';
import { SwaggerAnnotatedVerifiablePresentation } from '@bloxmove-com/did-asset-library-nestjs-obfuscated';
import { AccessTokenRequest } from '../common/classes/access-token-request.class';
@Controller('/')
export class VehicleRentalController {
  private readonly logger = new Logger(VehicleRentalController.name);
  constructor(private readonly vehicleRentalService: VehicleRentalService) {}

  @Post('rental-requests')
  @ApiBody({ type: RentalRequest })
  @ApiOperation({ description: 'Request a new rental with the given properties' })
  @ApiCreatedResponse({
    description: 'the rental contract has been successfully created',
    type: VerifiableCredential,
  })
  @ApiForbiddenResponse({ description: 'invalid consumerSignature or expired timestamp' })
  @ApiBadRequestResponse({ description: 'wrong or missing properties in request body' })
  @ApiNotFoundResponse({ description: 'the requested vehicle or service package could not be found' })
  @ApiConflictResponse({ description: 'the vehicle has been booked in the meantime' })
  async sendRentalRequest(@Body() rentalRequest: RentalRequest): Promise<{ offerConfirmVerifiableCredential: string | VerifiableCredential }> {
    this.logger.log(`Rental Request:  ${JSON.stringify(rentalRequest)}`);
    const offerConfirmVerifiableCredential = await this.vehicleRentalService.startRental(rentalRequest);
    return { offerConfirmVerifiableCredential };
  }

  @Post('rental-confirmations')
  @ApiBody({ type: RentalConfirmation })
  @ApiOperation({ description: 'Confirm the rental with the given contract DID' })
  @ApiCreatedResponse({ description: 'the rental contract has been successfully confirmed.' })
  @ApiForbiddenResponse({ description: 'invalid signedVerification' })
  @ApiResponse({ status: 423, description: 'rental contract is not in the required state to perform this action' })
  @ApiBadRequestResponse({ description: 'wrong or missing properties in request body' })
  @ApiConflictResponse({ description: 'the vehicle has been booked in the meantime' })
  async sendRentalConfirmation(@Body() rentalConfirmation: RentalConfirmation): Promise<void> {
    this.logger.log(`Rental Confirmation: ${JSON.stringify(rentalConfirmation)}`);
    await this.vehicleRentalService.completeStart(rentalConfirmation);
  }

  @Get('rentals/access-token')
  @ApiBody({ type: AccessTokenRequest })
  @ApiOperation({ description: 'Get an access token for vehicle unlock/lock' })
  @ApiOkResponse({ description: 'the accessToken is returned successfully', type: AccessTokenResponse })
  @ApiForbiddenResponse({ description: 'invalid consumersignature or verifiablecredential in header' })
  @ApiResponse({ status: 423, description: 'rental contract is not in the required state to perform this action' })
  @ApiBadRequestResponse({ description: 'wrong or missing properties in request body' })
  async getAccessToken(@Body() accessTokenRequest: AccessTokenRequest): Promise<IAccessTokenResponse> {
    this.logger.log(`Access Token Request: ${JSON.stringify(accessTokenRequest)}`);
    return await this.vehicleRentalService.getAccessToken(accessTokenRequest);
  }

  @Post('rental-end-requests')
  @ApiOperation({ description: 'Request the end of the rental with the given contract DID' })
  @ApiBody({ type: RentalEndRequest })
  @ApiCreatedResponse({ description: 'the request to end the rental has been successfully sent', type: UsageData })
  @ApiForbiddenResponse({ description: 'invalid consumerSignature or expired timestamp' })
  @ApiResponse({ status: 423, description: 'rental contract might be in the wrong state' })
  async sendRentalEndRequest(@Body() rentalEndRequest: RentalEndRequest): Promise<IUsageData> {
    this.logger.log(`Rental End Request: ${JSON.stringify(rentalEndRequest)}`);
    return await this.vehicleRentalService.endRental(rentalEndRequest);
  }

  @Post('rental-end-confirmations')
  @ApiOperation({ description: 'Confirm the end of the rental with the given contract DID' })
  @ApiBody({ type: RentalConfirmation })
  @ApiCreatedResponse({ description: 'the rental end has been successfully confirmed' })
  @ApiForbiddenResponse({ description: 'invalid signedVerification' })
  @ApiResponse({ status: 423, description: 'rental contract is not in the required state to perform this action' })
  async sendRentalEndConfirmation(@Body() rentalEndConfirmation: RentalConfirmation): Promise<void> {
    this.logger.log(`Rental End Confirmation: ${JSON.stringify(rentalEndConfirmation)}`);
    await this.vehicleRentalService.completeEnd(rentalEndConfirmation);
  }

  @Put('api/v1/door-status')
  @ApiBody({ type: DoorStatusUpdateRequest })
  @ApiOkResponse({ description: 'door status changed successfully' })
  @ApiForbiddenResponse({ description: 'invalid access token' })
  async updateDoorStatus(@Body() doorStatusUpdateRequest: IDoorStatusUpdateRequest): Promise<void> {
    this.logger.debug('updateDoorStatus tomp ...');
    await this.vehicleRentalService.verifyAccessTokenAndUpdateTompLeg(doorStatusUpdateRequest);
  }
}
