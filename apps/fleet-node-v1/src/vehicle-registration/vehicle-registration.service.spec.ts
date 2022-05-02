import { Test, TestingModule } from '@nestjs/testing';
import { AssetService, ConfigService, DummyAssetService, EnvConfigService } from '@bloxmove-com/did-asset-library-core-obfuscated';
import { NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { VehicleRegistrationService } from './vehicle-registration.service';
import { VehicleRegistrationController } from './vehicle-registration.controller';
import { of } from 'rxjs';
import { IVehicleRegistration } from '../common/interfaces/interfaces';
import { NameAlreadyExistsException } from '../common/exceptions/name-already-exists.exception';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SettlementService } from '../settlement/settlement.service';
import { DummySettlementService } from '../settlement/dummy-settlement.service';

describe('Vehicle Registration Service Test', () => {
  let assetService: AssetService;
  let vehicleRegistrationService: VehicleRegistrationService;
  let configService: ConfigService;

  const httpServiceMock = {
    get(url: string) {
      if (url.includes('freeVin')) {
        throw new NotFoundException('vin not found!');
      } else {
        return of({ data: 'claimedVin' });
      }
    },
    post(url: string) {
      return of({});
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      controllers: [VehicleRegistrationController],
      providers: [
        VehicleRegistrationService,
        { provide: ConfigService, useValue: new EnvConfigService('./testfiles/localtest.env') },
        { provide: AssetService, useClass: DummyAssetService },
        { provide: HttpService, useValue: httpServiceMock },
        { provide: SchedulerRegistry, useValue: jest.fn() },
        { provide: SettlementService, useClass: DummySettlementService },
      ],
    }).compile();

    assetService = module.get<AssetService>(AssetService);
    vehicleRegistrationService = module.get<VehicleRegistrationService>(VehicleRegistrationService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('create a vehicle asset', () => {
    it('should be defined', async () => {
      expect(assetService).toBeDefined();
      expect(vehicleRegistrationService).toBeDefined();
      expect(configService).toBeDefined();
    });

    it('should run a successful flow', async () => {
      const mockedFreeVin = 'freeVin';
      const mockedVehicleDID = 'did:ethr:blxm-local:0x111cbd9fb527d2105e9642ec41dc0b55d26ab5cc684427b7f104561e41603111';
      const mockedWalletDIDs = ['did:ethr:blxm-local:0x111807b7326ABd57d9a3B07b5FeC3a756c20d111'];
      const mockedVehicleRegistration: IVehicleRegistration = {
        vin: mockedFreeVin,
        walletDIDs: mockedWalletDIDs,
        proofOfOwnership: 'proof',
      };
      const mockedSignature = 'mockedSignature';
      jest.spyOn(assetService, 'createAsset').mockResolvedValue(mockedVehicleDID);
      jest.spyOn(assetService, 'addInvolvedParties').mockResolvedValue(null);
      jest.spyOn(assetService, 'signMessage').mockResolvedValue(mockedSignature);
      jest.spyOn(assetService, 'isValidDID').mockResolvedValue(true);
      const createdAssetDID = await vehicleRegistrationService.createDataAsset(mockedVehicleRegistration);
      expect(createdAssetDID).toStrictEqual(mockedVehicleDID);
    });

    it('should check if the vin already claimed and throw an Error', async () => {
      const mockedUsedVin = 'claimedVin';
      const mockedWalletDIDs = ['did:ethr:blxm-local:0x111807b7326ABd57d9a3B07b5FeC3a756c20d111'];
      const mockedVehicleRegistration: IVehicleRegistration = {
        vin: mockedUsedVin,
        walletDIDs: mockedWalletDIDs,
        proofOfOwnership: 'proof',
      };
      jest.spyOn(assetService, 'isValidDID').mockResolvedValue(true);
      expect(vehicleRegistrationService.createDataAsset(mockedVehicleRegistration)).rejects.toBeInstanceOf(NameAlreadyExistsException);
    });
  });
});
