import { Test, TestingModule } from '@nestjs/testing';
import {
  AssetService,
  ConfigService,
  DummyAssetService,
  EnvConfigService,
} from '@bloxmove-com/did-asset-library-core-obfuscated';
import { VehicleChargingService } from './vehicle-charging.service';
import { VehicleChargingController } from './vehicle-charging.controller';

import { HttpService } from '@nestjs/axios';
import { ChargingHelperService } from './charging-helper/charging-helper.service';
import { lastValueFrom, of } from 'rxjs';
import { VerifiableCredential } from '@bloxmove-com/did-asset-library-core-obfuscated';
import { ForbiddenException } from '@nestjs/common';

describe('Vehicle Charging Service Test', () => {
  let assetService: AssetService;
  let vehicleChargingService: VehicleChargingService;
  let chargingHelperService: ChargingHelperService;
  let configService: ConfigService;

  const httpMock = jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
  }))();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      controllers: [VehicleChargingController],
      providers: [
        VehicleChargingService,
        ChargingHelperService,
        { provide: ConfigService, useValue: new EnvConfigService('./testfiles/localtest.env') },
        { provide: AssetService, useClass: DummyAssetService },
        { provide: HttpService, useValue: httpMock }
      ],
    }).compile();

    assetService = module.get<AssetService>(AssetService);
    vehicleChargingService = module.get<VehicleChargingService>(VehicleChargingService);
    chargingHelperService = module.get<ChargingHelperService>(ChargingHelperService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('charge process', () => {
    it('should be defined', async () => {
      expect(assetService).toBeDefined();
      expect(vehicleChargingService).toBeDefined();
      expect(chargingHelperService).toBeDefined();
      expect(configService).toBeDefined();
    });

    it('charge-session-authorize', async () => {
      jest.spyOn(assetService, 'createAsset').mockResolvedValue("did:test:TEST");
      jest.spyOn(httpMock, 'post').mockReturnValueOnce(of({ errors: [] }));
      jest.spyOn(httpMock, 'post').mockReturnValueOnce(of({}));
      jest.spyOn(assetService, 'createVerifiableCredential').mockReturnValue(lastValueFrom(of({} as VerifiableCredential)));

      const chargeSessionAuthorizeRequest = {
        token: {
          uid: "string"
        },
        session: {
          country_code: "string",
          party_id: "string",
          location_id: "string",
          evse_uid: "string",
          connector_id: "string",
        }
      }

      const { contractDID } = await vehicleChargingService.chargeSessionAuthorize(chargeSessionAuthorizeRequest)
      expect(contractDID).toStrictEqual("did:test:TEST");
      expect(httpMock.post).toBeCalledTimes(2)
    });

    it('charge-session-authorization-callback', async () => {
      jest.spyOn(httpMock, 'post').mockReturnValueOnce(of({ data: { jwt: "someJWT" } }));
      jest.spyOn(httpMock, 'post').mockReturnValueOnce(of({}));
      jest.spyOn(assetService, 'createVerifiableCredential').mockReturnValue(lastValueFrom(of({} as VerifiableCredential)));

      const handleChargeSessionAuthorizationCallbackRequest = {
        transactionId: "string",
        exchangeId: "string",
        vpRequest: {},
        presentationSubmission: {
          verificationResult: {
            checks: [
              "string"
            ],
            warnings: [
              "string"
            ],
            errors: [
              "string"
            ]
          },
          vp: {
            presentation: {
              verifiableCredential: [
                {
                  type: [
                    "VerifiableCredential",
                    "EWFRole"
                  ],
                  credentialSubject: {
                    id: "testDID",
                    role: {
                      namespace: "customer.roles.rebeam.apps.eliagroup.iam.ewc",
                      version: "1"
                    },
                    issuerFields: []
                  }
                },
                {
                  credentialSubject: {
                    chargingData: {
                      contractDID: "testDID",
                      evseId: "evseId",
                      timeStamp: "timestamp"
                    }
                  }
                }
              ]
            }
          }
        }
      }

      await vehicleChargingService.handleChargeSessionAuthorizationCallback(handleChargeSessionAuthorizationCallbackRequest)
      expect(httpMock.post).toBeCalledTimes(2)
    });


    it('charge-session-authorization-callback wrong EWF role', async () => {
      const handleChargeSessionAuthorizationCallbackRequest = {
        transactionId: "string",
        exchangeId: "string",
        vpRequest: {},
        presentationSubmission: {
          verificationResult: {
            checks: [
              "string"
            ],
            warnings: [
              "string"
            ],
            errors: [
              "string"
            ]
          },
          vp: {
            presentation: {
              verifiableCredential: [
                {
                  type: [
                    "VerifiableCredential",
                    "EWFRole"
                  ],
                  credentialSubject: {
                    id: "testDID",
                    role: {
                      namespace: "not.a.valid.role",
                      version: "1"
                    },
                    issuerFields: []
                  }
                },
                {
                  credentialSubject: {
                    chargingData: {
                      contractDID: "testDID",
                      evseId: "evseId",
                      timeStamp: "timestamp"
                    }
                  }
                }
              ]
            }
          }
        }
      }

      await expect(vehicleChargingService.handleChargeSessionAuthorizationCallback(handleChargeSessionAuthorizationCallbackRequest)).rejects.toThrow(ForbiddenException);
    });

    it('charge-end-session-authorize', async () => {
      jest.spyOn(httpMock, 'post').mockReturnValueOnce(of({ errors: [] }));
      jest.spyOn(httpMock, 'post').mockReturnValueOnce(of({}));
      jest.spyOn(assetService, 'createVerifiableCredential').mockReturnValue(lastValueFrom(of({} as VerifiableCredential)));

      const chargeEndSessionAuthorizeRequest = {
        token: {
          uid: "string"
        },
        session: {
          country_code: "string",
          party_id: "string",
          location_id: "string",
          evse_uid: "string",
          connector_id: "string",
        },
        contractDID: "someDID"
      }

      await vehicleChargingService.chargeEndSessionAuthorize(chargeEndSessionAuthorizeRequest)
      expect(httpMock.post).toBeCalledTimes(2)
    });


    it('charge-end-session-authorization-callback', async () => {
      jest.spyOn(httpMock, 'post').mockReturnValueOnce(of({ data: { jwt: "someJWT" } }));
      jest.spyOn(httpMock, 'post').mockReturnValueOnce(of({}));
      jest.spyOn(assetService, 'createVerifiableCredential').mockReturnValue(lastValueFrom(of({} as VerifiableCredential)));

      const handleChargeEndSessionAuthorizationCallbackRequest = {
        transactionId: "string",
        exchangeId: "string",
        vpRequest: {},
        presentationSubmission: {
          verificationResult: {
            checks: [
              "string"
            ],
            warnings: [
              "string"
            ],
            errors: [
              "string"
            ]
          },
          vp: {
            presentation: {
              verifiableCredential: [
                {
                  credentialSubject: {
                    chargingData: {
                      kwh: "233",
                      contractDID: "testDID",
                      evseId: "evseId",
                      timeStamp: "timestamp"
                    }
                  }
                }
              ]
            }
          }
        }
      }

      await vehicleChargingService.handleChargeEndSessionAuthorizationCallback(handleChargeEndSessionAuthorizationCallbackRequest)
      expect(httpMock.post).toBeCalledTimes(2)
    });

    it('charge-session-start', async () => {
      jest.spyOn(assetService, 'createDataProperty').mockResolvedValue(null);
      jest.spyOn(assetService, 'createVerifiableCredential').mockReturnValue(lastValueFrom(of({} as VerifiableCredential)));

      const chargingStartRequest = {
        session: {
          country_code: "string",
          party_id: "string",
          id: "string",
          start_date_time: "string",
          location_id: "string",
          evse_uid: "string",
          connector_id: "string",
          end_date_time: "string",
          kwh: 0,
          cdr_token: {},
          auth_method: "string",
          authorization_reference: "string",
          meter_id: "string",
          currency: "string",
          charging_periods: [
            {}
          ],
          total_cost: {},
          status: "string",
          last_updated: "string"
        },
        contractDID: "someDID"
      }

      await vehicleChargingService.chargingStart(chargingStartRequest)
      expect(assetService.createDataProperty).toHaveBeenCalled()
    });

    it('charge-session-update', async () => {
      jest.spyOn(assetService, 'createDataProperty').mockResolvedValue(null);
      jest.spyOn(httpMock, 'post').mockReturnValueOnce(of({}));
      jest.spyOn(assetService, 'createVerifiableCredential').mockReturnValue(lastValueFrom(of({} as VerifiableCredential)));

      const chargingUpdateRequest = {
        session: {
          country_code: "string",
          party_id: "string",
          id: "string",
          start_date_time: "string",
          location_id: "string",
          evse_uid: "string",
          connector_id: "string",
          end_date_time: "string",
          kwh: 0,
          cdr_token: {},
          auth_method: "string",
          authorization_reference: "string",
          meter_id: "string",
          currency: "string",
          charging_periods: [
            {}
          ],
          total_cost: {},
          status: "string",
          last_updated: "string"
        },
        contractDID: "someDID"
      }

      await vehicleChargingService.chargingUpdate(chargingUpdateRequest)
      expect(assetService.createDataProperty).toHaveBeenCalled()
    });


    it('charge-session-end', async () => {
      jest.spyOn(httpMock, 'post').mockReturnValueOnce(of({}));
      jest.spyOn(assetService, 'createDataProperty').mockResolvedValue(null);
      jest.spyOn(assetService, 'createVerifiableCredential').mockReturnValue(lastValueFrom(of({} as VerifiableCredential)));

      const chargingEndRequest = {
        session: {
          country_code: "string",
          party_id: "string",
          id: "string",
          start_date_time: "string",
          location_id: "string",
          evse_uid: "string",
          connector_id: "string",
          end_date_time: "string",
          kwh: 0,
          cdr_token: {},
          auth_method: "string",
          authorization_reference: "string",
          meter_id: "string",
          currency: "string",
          charging_periods: [
            {}
          ],
          total_cost: {},
          status: "string",
          last_updated: "string"
        },
        chargeDetailRecord: {
          country_code: "string",
          party_id: "string",
          id: "string",
          start_date_time: "string",
          end_date_time: "string",
          session_id: "string",
          cdr_token: {},
          auth_method: "string",
          authorization_reference: "string",
          cdr_location: {},
          meter_id: "string",
          currency: "string",
          tariffs: {},
          charging_periods: [
            {}
          ],
          signed_data: {},
          total_cost: {},
          total_fixed_cost: {},
          total_energy: 0,
          total_energy_cost: {},
          total_time: 0,
          total_time_cost: {},
          total_parking_time: 0,
          total_parking_cost: {},
          total_reservation_cost: {},
          remark: "string",
          invoice_reference_id: "string",
          credit: true,
          credit_reference_id: "string",
          last_updated: "string"
        },
        contractDID: "someDID"
      }

      await vehicleChargingService.chargingEnd(chargingEndRequest)
      expect(assetService.createDataProperty).toHaveBeenCalledTimes(2)
      expect(httpMock.post).toBeCalledTimes(1)
    });
  });
});
