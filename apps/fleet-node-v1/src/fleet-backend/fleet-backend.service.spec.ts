import { Test, TestingModule } from '@nestjs/testing';
import { AssetService, ConfigService, DummyAssetService, EnvConfigService } from '@bloxmove-com/did-asset-library-core-obfuscated';
import { FleetBackendService } from './fleet-backend.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { IVehicleServiceAggregator } from '../common/interfaces/interfaces';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BloxmoveTompGatewayService } from '../tomp/bloxmove-tomp-gateway.service';
import { VehicleType } from '../common/enums';

describe('Fleet-Backend Service Test', () => {
  let assetService: AssetService;
  let fleetBackendService: FleetBackendService;
  let configService: ConfigService;
  let bloxmoveTompGatewayService: BloxmoveTompGatewayService;

  const ownAccountDID = 'did:ethr:blxm-local:DUMMY_FLEET_DID';
  const otherAccountDID = 'did:ethr:blxm-local:OTHER_FLEET_DID';
  const backfillServiceCatalog: IVehicleServiceAggregator[] = [
    {
      brand: 'Dummy Brand',
      fleetOwnerDID: otherAccountDID,
      fleetOwnerName: 'Dummy Owner',
      fleetNodeUrl: 'http://localhost.dummy',
      fuelLevel: 50,
      fuelType: 'Diesel',
      vehicleDID: 'did:ethr:blxm-local:DUMMY_VEHICLE_DID',
      vehicleType: VehicleType.CAR,
      batteryMaxCapacity: null,
      packages: [
        {
          packageId: 123,
          description: 'Dummy package description',
          packageName: 'Dummy package',
          pricePerKm: 1,
          pricePerMinute: 0.4,
          currency: 'EUR',
          requiredBusinessClaims: [],
          requiredUserClaims: [],
          termsConditions: 'Dummy terms & conditions',
          validityPeriods: [
            {
              from: 1575992965,
              to: 1690000000,
            },
          ],
        },
      ],
      locLat: 48.78485,
      locLong: 9.16009,
      licensePlate: 'DUM-MY-2020',
      model: 'Dummy model',
      numberOfDoors: 5,
      numberOfSeats: 5,
      transmission: 'Automatic',
    },
  ];

  const httpMock = jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
  }))();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      controllers: [],
      providers: [
        {
          provide: ConfigService,
          useValue: new EnvConfigService('./testfiles/localtest.env'),
        },
        { provide: AssetService, useClass: DummyAssetService },
        { provide: HttpService, useValue: httpMock },
        { provide: SchedulerRegistry, useValue: jest.fn() },
        FleetBackendService,
        BloxmoveTompGatewayService,
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
    assetService = module.get<AssetService>(AssetService);
    fleetBackendService = module.get<FleetBackendService>(FleetBackendService);
    bloxmoveTompGatewayService = module.get<BloxmoveTompGatewayService>(BloxmoveTompGatewayService);
  });

  it('should be defined', () => {
    expect(assetService).toBeDefined();
    expect(fleetBackendService).toBeDefined();
    expect(configService).toBeDefined();
  });

  it('should merge other backfill packages', async () => {
    jest
      .spyOn(httpMock, 'get')
      .mockReturnValueOnce(of({ data: backfillServiceCatalog }))
      .mockReturnValueOnce(of({ data: [] }));
    jest.spyOn(httpMock, 'post').mockReturnValue(of({ data: { accessToken: '1234' } }));
    jest
      .spyOn(configService, 'get')
      .mockReturnValueOnce('dummy_url')
      .mockReturnValueOnce('dummy_apiKey_service_catalog_aggregator')
      .mockReturnValueOnce('dummy_fleetbackendUser')
      .mockReturnValueOnce('dummy_fleetbackendPassword')
      .mockReturnValueOnce(ownAccountDID)
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('minAge18,driverLicense');
    await fleetBackendService.updateBackfillPackages();
    const mergedServiceCatalog = await fleetBackendService.getServiceCatalogFromBackendRequest(true);
    expect(mergedServiceCatalog.length).toEqual(1);
    // currently the generated service packages should get a fix defined price increase of 7,5%
    expect(mergedServiceCatalog[0].servicePackages[0].pricePerKm).toEqual(backfillServiceCatalog[0].packages[0].pricePerKm * 1.075);
  });

  it('should filter own backfill packages', async () => {
    jest
      .spyOn(httpMock, 'get')
      .mockReturnValueOnce(of({ data: backfillServiceCatalog }))
      .mockReturnValueOnce(of({ data: [] }));
    jest.spyOn(httpMock, 'post').mockReturnValue(of({ data: { accessToken: '1234' } }));
    // we fake to be the other fleet
    jest
      .spyOn(configService, 'get')
      .mockReturnValueOnce('dummy_url')
      .mockReturnValueOnce('dummy_apiKey_service_catalog_aggregator')
      .mockReturnValueOnce(otherAccountDID)
      .mockReturnValueOnce('dummy_fleetbackendUser')
      .mockReturnValueOnce('dummy_fleetbackendPassword');
    await fleetBackendService.updateBackfillPackages();
    const mergedServiceCatalog = await fleetBackendService.getServiceCatalogFromBackendRequest(true);
    // as we are the fleetOwner that publishes the packages it should be filtered
    expect(mergedServiceCatalog.length).toEqual(0);
  });

  it('should always determine the same packageId', async () => {
    jest
      .spyOn(httpMock, 'get')
      .mockReturnValueOnce(of({ data: backfillServiceCatalog }))
      .mockReturnValueOnce(of({ data: [] }))
      .mockReturnValueOnce(of({ data: backfillServiceCatalog }))
      .mockReturnValueOnce(of({ data: [] }));
    jest.spyOn(httpMock, 'post').mockReturnValue(of({ data: { accessToken: '1234' } }));
    jest
      .spyOn(configService, 'get')
      .mockReturnValueOnce('dummy_url')
      .mockReturnValueOnce('dummy_apiKey_service_catalog_aggregator')
      .mockReturnValueOnce('dummy_fleetbackendUser')
      .mockReturnValueOnce('dummy_fleetbackendPassword')
      .mockReturnValueOnce(ownAccountDID)
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('minAge18,driverLicense')
      .mockReturnValueOnce('dummy_url')
      .mockReturnValueOnce('dummy_apiKey_service_catalog_aggregator')
      .mockReturnValueOnce('dummy_fleetbackendUser')
      .mockReturnValueOnce('dummy_fleetbackendPassword')
      .mockReturnValueOnce(ownAccountDID)
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('minAge18,driverLicense');
    await fleetBackendService.updateBackfillPackages();
    const mergedServiceCatalog = await fleetBackendService.getServiceCatalogFromBackendRequest(true);
    expect(mergedServiceCatalog.length).toEqual(1);
    const generatedPackageId = mergedServiceCatalog[0].servicePackages[0].packageId;

    await fleetBackendService.updateBackfillPackages();
    const newMergedServiceCatalog = await fleetBackendService.getServiceCatalogFromBackendRequest(true);
    expect(newMergedServiceCatalog.length).toEqual(1);
    expect(generatedPackageId).toEqual(newMergedServiceCatalog[0].servicePackages[0].packageId);
  });
});
