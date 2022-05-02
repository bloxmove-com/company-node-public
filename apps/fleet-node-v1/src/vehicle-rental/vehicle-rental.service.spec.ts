import { Test, TestingModule } from '@nestjs/testing';
import {
  AssetService,
  ConfigService,
  DummyAssetService,
  EnvConfigService,
  LinkedDataProof,
  VerifiableCredential,
  VerifiablePresentation,
} from '@bloxmove-com/did-asset-library-core-obfuscated';
import { VehicleRentalService } from './vehicle-rental.service';
import { VehicleRentalController } from './vehicle-rental.controller';
import { IVehicleContractData, IRentalEndRequest, IUsageData } from '../common/interfaces/interfaces';
import { FleetBackendService } from '../fleet-backend/fleet-backend.service';
import { HttpService } from '@nestjs/axios';
import { VehicleContractData } from '../common/classes/vehicle-contract-data.class';
import { RentalRequest } from '../common/classes/rental-request.class';
import { RentalConfirmation } from '../common/classes/rental-confirmation.class';
import { AccessTokenResponse } from '../common/classes/access-token-response.class';
import { UsageData } from '../common/classes/usage-data.class';
import { RentalEndRequest } from '../common/classes/rental-end-request.class';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SettlementService } from '../settlement/settlement.service';
import { DummySettlementService } from '../settlement/dummy-settlement.service';
import { BloxmoveTompGatewayService } from '../tomp/bloxmove-tomp-gateway.service';
import { RentalHelperService } from './rental-helper/rental-helper.service';
import { BackfillHttpService } from './backfill-http/backfill-http.service';
// tslint:disable-next-line:max-line-length
describe('Vehicle Rental Service Test', () => {
  let assetService: AssetService;
  let vehicleRentalService: VehicleRentalService;
  let rentalHelperService: RentalHelperService;
  let backfillHttpService: BackfillHttpService;
  let fleetBackendService: FleetBackendService;
  let bloxmoveTompGatewayService: BloxmoveTompGatewayService;
  let configService: ConfigService;

  const httpMock = jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
  }))();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      controllers: [VehicleRentalController],
      providers: [
        VehicleRentalService,
        RentalHelperService,
        BloxmoveTompGatewayService,
        FleetBackendService,
        BackfillHttpService,
        { provide: ConfigService, useValue: new EnvConfigService('./testfiles/localtest.env') },
        { provide: AssetService, useClass: DummyAssetService },
        { provide: HttpService, useValue: httpMock },
        { provide: SchedulerRegistry, useValue: jest.fn() },
        { provide: SettlementService, useClass: DummySettlementService },
      ],
    }).compile();

    assetService = module.get<AssetService>(AssetService);
    vehicleRentalService = module.get<VehicleRentalService>(VehicleRentalService);
    fleetBackendService = module.get<FleetBackendService>(FleetBackendService);
    bloxmoveTompGatewayService = module.get<BloxmoveTompGatewayService>(BloxmoveTompGatewayService);
    rentalHelperService = module.get<RentalHelperService>(RentalHelperService);
    backfillHttpService = module.get<BackfillHttpService>(BackfillHttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('rent a vehicle', () => {
    it('should be defined', async () => {
      expect(assetService).toBeDefined();
      expect(fleetBackendService).toBeDefined();
      expect(configService).toBeDefined();
      expect(bloxmoveTompGatewayService).toBeDefined();
    });

    it('should run a successful flow', async () => {
      const accountDID = configService.get('accountDID');
      const mockedVehicleDID = 'dummyVehicleDID';
      const mockedConsumerDID = 'dummyConsumerDID';
      const requiredUserClaims = ['minAge18'];
      const mockedContractData: IVehicleContractData = new VehicleContractData(
        mockedVehicleDID,
        5,
        0,
        'dummyConditions',
        requiredUserClaims,
        mockedConsumerDID,
        'EUR',
      );
      const mockedContractDID = 'dummyContractDID';
      const mockedVin = 'dummyVin';
      const mockedUsageData: IUsageData = new UsageData(mockedVin, mockedVehicleDID, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '');
      const mockedEndPoint = 'dummyEndPoint';
      const mockedKYCDID = 'did:ethr:blxm-local:0xaFBbE0d56a48aE827e6Cf03e304C97D1B6ff29Cf';
      const mockedProof: LinkedDataProof = {
        created: new Date().toISOString(),
        type: 'EcdsaSecp256k1RecoveryMethod2020',
        proofPurpose: 'assertionMethod',
        verificationMethod: 'dummy',
      };
      const mockedRequestAccessToken: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'AccessRequestCredential'],
        credentialSubject: { id: mockedContractDID, topic: '/consumerAccessTokenRequest' },
        issuer: mockedConsumerDID,
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 1000).toISOString(),
      };
      const mockedVehicleAccess: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'AccessRequestCredential'],
        credentialSubject: { id: mockedConsumerDID, vehicleDID: mockedVehicleDID, rentalContractDID: mockedContractDID },
        issuer: mockedConsumerDID,
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 1000).toISOString(),
      };

      const mockedOfferConfirm: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'OfferConfirmCredential'],
        credentialSubject: { id: mockedContractDID, topic: '/offerConfirm' },
        issuer: accountDID,
        issuanceDate: new Date().toISOString(),
      };
      const mockedUserAttestation: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'MinAgeCredential'],
        credentialSubject: { id: mockedContractDID, topic: '/minAge18' },
        issuer: mockedConsumerDID,
        issuanceDate: new Date().toISOString(),
      };
      const mockedProviderConfirm: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'ProviderConfirmCredential'],
        credentialSubject: { id: mockedContractDID, topic: '/providerConfirm' },
        issuer: accountDID,
        issuanceDate: new Date().toISOString(),
      };
      const mockedConsumerConfirm: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'ConsumerConfirmCredential'],
        credentialSubject: { id: mockedContractDID, topic: '/consumerConfirm' },
        issuer: mockedConsumerDID,
        issuanceDate: new Date().toISOString(),
      };
      const mockerConsumerConfirmVP: VerifiablePresentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation', 'RentalRequestPresentation'],
        verifiableCredential: [mockedOfferConfirm, mockedConsumerConfirm],
        proof: mockedProof,
      };
      const mockedConsumerEndConfirm: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'ConsumerConfirmCredential'],
        credentialSubject: { id: mockedContractDID, topic: '/consumerEndConfirm' },
        issuer: mockedConsumerDID,
        issuanceDate: new Date().toISOString(),
      };
      const mockedConsumerEndConfirmVP: VerifiablePresentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation', 'ConsumerEndConfirmCredential'],
        verifiableCredential: [mockedOfferConfirm, mockedConsumerEndConfirm],
        proof: mockedProof,
      };
      const mockedConsumerEndRequest: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'ConsumerEndConfirmCredential'],
        credentialSubject: { id: mockedContractDID, topic: '/consumerEndRequest' },
        issuer: mockedConsumerDID,
        issuanceDate: new Date().toISOString(),
      };
      const mockedProviderEndConfirm: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'ProviderEndConfirmCredential'],
        credentialSubject: { id: mockedContractDID, topic: '/providerEndConfirm' },
        issuer: accountDID,
        issuanceDate: new Date().toISOString(),
      };

      const mockedRequestAccessTokenVP: VerifiablePresentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        verifiableCredential: [mockedOfferConfirm, mockedRequestAccessToken],
        proof: mockedProof,
      };

      const mockerConsumerVCs: VerifiableCredential[] = [
        {
          '@context': ['https://www.w3.org/2018/credentials/v1'],
          type: ['VerifiableCredential', 'DriverLicenseType'],
          credentialSubject: { id: mockedConsumerDID, driverLicense: true },
          issuer: mockedKYCDID,
          issuanceDate: new Date().toISOString(),
        },
        {
          '@context': ['https://www.w3.org/2018/credentials/v1'],
          type: ['VerifiableCredential', 'MinAge18Type'],
          credentialSubject: { id: mockedConsumerDID, minAge18: true },
          issuer: mockedKYCDID,
          issuanceDate: new Date().toISOString(),
        },
      ];

      const mockerConsumerVP: VerifiablePresentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation', 'RentalRequestPresentation'],
        verifiableCredential: mockerConsumerVCs,
        proof: mockedProof,
      };

      jest.spyOn(fleetBackendService, 'getRentalRelevantDataFromFleetBackend').mockResolvedValue(mockedContractData);
      jest.spyOn(fleetBackendService, 'bookVehicle').mockResolvedValue();
      jest.spyOn(fleetBackendService, 'releaseVehicle').mockResolvedValue(mockedUsageData);
      jest.spyOn(fleetBackendService, 'getFleetNodeUrl').mockResolvedValue('');
      jest.spyOn(assetService, 'setAttestation').mockResolvedValue(null);
      jest.spyOn(assetService, 'verifySignature').mockResolvedValue(true);
      jest.spyOn(assetService, 'createDataProperty').mockResolvedValue();
      jest.spyOn(assetService, 'createVerifiableCredential').mockResolvedValue(mockedOfferConfirm);

      jest.spyOn(assetService, 'getOwner').mockResolvedValue(accountDID);
      jest.spyOn(assetService, 'getDataProperty').mockResolvedValueOnce(mockedVin);
      jest.spyOn(assetService, 'getAttestations').mockResolvedValueOnce([mockedUserAttestation]);
      jest.spyOn(assetService, 'createAsset').mockResolvedValue(mockedContractDID);
      jest.spyOn(assetService, 'validateVerifiablePresentation').mockResolvedValue(mockerConsumerVCs);
      const rentalRequest = new RentalRequest(mockedVehicleDID, mockedConsumerDID, 51, mockerConsumerVP);
      const offerConfirmVC = await vehicleRentalService.startRental(rentalRequest) as VerifiableCredential;
      expect(offerConfirmVC.credentialSubject['id']).toStrictEqual(mockedContractDID);

      jest.spyOn(assetService, 'getDataProperty').mockResolvedValueOnce(JSON.stringify(mockedContractData)).mockResolvedValueOnce(null); // usage data should not exist
      jest
        .spyOn(assetService, 'getAttestations')
        .mockResolvedValueOnce([mockedUserAttestation]) // Attestation 'providerEndConfirm' should not exist
        //.mockResolvedValueOnce([mockedUserAttestation]) // user attestations
        .mockResolvedValueOnce([mockedOfferConfirm]);
      jest.spyOn(assetService, 'validateVerifiableCredential')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockedConsumerConfirm)
        .mockResolvedValueOnce(mockedOfferConfirm);
      jest.spyOn(assetService, 'validateVerifiablePresentation').mockResolvedValue([mockedConsumerConfirm, mockedOfferConfirm]);
      const rentalConfirmation = new RentalConfirmation(mockerConsumerConfirmVP);
      await vehicleRentalService.completeStart(rentalConfirmation);

      jest
        .spyOn(assetService, 'getDataProperty')
        .mockResolvedValueOnce(JSON.stringify(mockedContractData))
        .mockResolvedValueOnce(null) // usage data should not exist
        .mockResolvedValueOnce(mockedEndPoint);
      jest
        .spyOn(assetService, 'getAttestations')
        .mockResolvedValueOnce([mockedProviderConfirm]) // Attestation 'providerConfirm' should exist
        .mockResolvedValueOnce([mockedConsumerConfirm]);
      jest.spyOn(assetService, 'validateVerifiableCredential')
        .mockResolvedValueOnce(mockedProviderConfirm)
        .mockResolvedValueOnce(mockedConsumerConfirm)
        .mockResolvedValueOnce(mockedRequestAccessToken);
      jest.spyOn(assetService, 'validateVerifiablePresentation').mockResolvedValue([mockedRequestAccessToken, mockedOfferConfirm]);
      jest.spyOn(assetService, 'createVerifiableCredential').mockResolvedValueOnce(mockedVehicleAccess).mockResolvedValueOnce(mockedVehicleAccess);
      const accessTokenRespone = new AccessTokenResponse([mockedVehicleAccess], mockedEndPoint);
      const returnedAccessTokenResponse = await vehicleRentalService.getAccessToken({ verifiablePresentation: mockedRequestAccessTokenVP });

      expect(returnedAccessTokenResponse).toStrictEqual(accessTokenRespone);

      jest.spyOn(assetService, 'getDataProperty').mockResolvedValueOnce(JSON.stringify(mockedContractData)).mockResolvedValueOnce(null); // usage data should not exist
      jest.spyOn(assetService, 'getAttestations').mockResolvedValueOnce([mockedProviderConfirm]); // check if Attestation 'providerConfirm' exist
      jest.spyOn(assetService, 'validateVerifiableCredential')
        .mockResolvedValueOnce(mockedConsumerEndRequest)
        .mockResolvedValueOnce(mockedProviderConfirm);
      jest.spyOn(assetService, 'validateVerifiablePresentation').mockResolvedValueOnce([mockedConsumerEndRequest, mockedOfferConfirm]);
      const rentalEndConfirmation: IRentalEndRequest = new RentalEndRequest(mockedConsumerEndConfirmVP);
      const returnedUsageData = await vehicleRentalService.endRental(rentalEndConfirmation);
      expect(returnedUsageData).toStrictEqual(mockedUsageData);

      jest
        .spyOn(assetService, 'getDataProperty')
        .mockResolvedValueOnce(JSON.stringify(mockedContractData))
        .mockResolvedValueOnce(JSON.stringify(mockedUsageData))
        .mockResolvedValueOnce('dummyAgreementId');
      jest
        .spyOn(assetService, 'getAttestations')
        .mockResolvedValueOnce([mockedProviderEndConfirm]) // check if Attestation 'providerEndConfirm' exist
        .mockResolvedValueOnce([mockedProviderEndConfirm]); // check if Attestation 'providerEndConfirm' exist
      jest.spyOn(assetService, 'validateVerifiableCredential')
        .mockResolvedValueOnce(mockedProviderEndConfirm)
        .mockResolvedValueOnce(mockedProviderEndConfirm)
        .mockResolvedValueOnce(mockedConsumerEndConfirm);
      await vehicleRentalService.completeEnd(rentalConfirmation);
    });
  });
});
