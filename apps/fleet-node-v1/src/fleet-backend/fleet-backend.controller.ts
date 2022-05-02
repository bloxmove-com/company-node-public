import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { FleetBackendService } from './fleet-backend.service';
import {
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { IServiceCatalogEntry, ITelematicsRecord } from '../common/interfaces/interfaces';
import { TelematicsRecord } from '../common/classes/telematic-data.class';
import { ServiceCatalog } from '../common/classes/service-catalog.class';

@Controller('/')
export class FleetBackendController {
  constructor(private readonly fleetBackendService: FleetBackendService) {}

  @Get('/service-catalog')
  @ApiOperation({ description: 'Get all services the fleet owner running this fleet node provides' })
  @ApiOkResponse({ description: 'a list of all available services', type: ServiceCatalog, isArray: true })
  async getServiceCatalog(): Promise<IServiceCatalogEntry[]> {
    return this.fleetBackendService.getServiceCatalog();
  }

  @Post('/vehicles/:vin/telematics-data')
  @ApiBody({ type: TelematicsRecord })
  @ApiOperation({
    description:
      'Store a telematics record for the given VIN and input data, signature over data must correspond to an authorized public key for the vehicle asset',
  })
  @ApiCreatedResponse({ description: 'the telematic data has been successfully added.' })
  @ApiForbiddenResponse({ description: 'invalid deviceSignature' })
  @ApiNotFoundResponse({ description: 'vehicle not registered in the naming system' })
  @ApiBadRequestResponse({ description: 'wrong or missing properties in request body' })
  async sendTelematicData(@Param('vin') vin: string, @Body() telematicsData: ITelematicsRecord): Promise<void> {
    return this.fleetBackendService.addTelematicData(vin, telematicsData);
  }
}
