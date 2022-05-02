import { Injectable, Logger, InternalServerErrorException, NotFoundException, HttpException, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AssetService, ConfigService, IDataProperties, PermissionsEnum } from '@bloxmove-com/did-asset-library-core-obfuscated';
import { IVehicleRegistration, IAssetRegistration, ITelematicsRegistration } from '../common/interfaces/interfaces';
import { map, catchError } from 'rxjs/operators';
import { NameAlreadyExistsException } from '../common/exceptions/name-already-exists.exception';
import { SettlementService } from '../settlement/settlement.service';
import { VehicleDetails } from '../common/classes/vehicle-details.class';

@Injectable()
export class VehicleRegistrationService {
  private readonly logger = new Logger(VehicleRegistrationService.name);

  private vehicleAuthorityBaseUrl: string;
  private ownFleetNodeUrl: string;
  private apiType: string;
  private virtualCarWalletBaseUrl: string;
  private virtualCarWalletApiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly assetService: AssetService,
    private readonly httpService: HttpService,
    private readonly settlementService: SettlementService,
  ) {
    this.vehicleAuthorityBaseUrl = this.config.get('vehicleAuthorityBaseUrl');
    this.ownFleetNodeUrl = this.config.get('ownFleetNodeUrl');
    this.apiType = this.config.get('apiType');
    this.virtualCarWalletBaseUrl = this.config.get('virtualCarWalletBaseUrl');
    this.virtualCarWalletApiKey = this.config.get('virtualCarWalletApiKey');
  }

  async createDataAsset(vehicleRegistration: IVehicleRegistration): Promise<string> {
    // verify walletDIDs
    try {
      await Promise.all(
        vehicleRegistration.walletDIDs.map(async (involvedPartyDID) => {
          return await this.assetService.isValidDID(involvedPartyDID);
        }),
      );
    } catch (error) {
      throw new BadRequestException('Not a valid walletDID');
    }

    await this.verifyClaimedVin(vehicleRegistration.vin);
    const assetName = 'VehicleAsset: ' + vehicleRegistration.vin;

    const initialDataPropertyKeys: IDataProperties = {
      vin: vehicleRegistration.vin,
    };

    if (this.apiType === 'tomp') {
      initialDataPropertyKeys.authEndpoint = this.ownFleetNodeUrl;
    }

    const assetDID = await this.assetService.createAsset(assetName, initialDataPropertyKeys);
    this.logger.log('Asset DID: ' + assetDID);

    if (vehicleRegistration.walletDIDs.length > 0) {
      await this.assetService.addInvolvedParties(assetDID, vehicleRegistration.walletDIDs, [PermissionsEnum.SETDATA, PermissionsEnum.SIGNER]);
      this.logger.log('Involved parties added');
    }

    const message = assetDID + vehicleRegistration.proofOfOwnership;
    const signature = await this.assetService.signMessage(message);
    const assetRegistration: IAssetRegistration = {
      assetDID,
      proofOfOwnership: vehicleRegistration.proofOfOwnership,
      ownerSignature: signature,
    };
    await this.registerAddress(assetRegistration);

    await this.settlementService.registerAsset(assetDID);

    const telematicsRegistration: ITelematicsRegistration = {
      vin: vehicleRegistration.vin,
      zone: vehicleRegistration.zone,
      thingId: vehicleRegistration.thingId,
    };

    if (telematicsRegistration.zone || telematicsRegistration.thingId) {
      try {
        await this.registerTelematicsBox(telematicsRegistration);
      } catch (error) {
        throw new Error('Something went wrong while registering the car');
      }
    } else {
      const defaultZone = this.config.getOrDefault('defaultZone', 'STUTTGART');

      telematicsRegistration.zone = defaultZone;
      await this.registerTelematicsBox(telematicsRegistration);
    }
    return assetDID;
  }

  async getDataAsset(vin: string): Promise<any> {
    const name = vin + '.' + this.config.getOrThrow('vehicleAuthorityVehicleParentDomain');
    const vehicleDID = await this.assetService.resolveName(name);
    if (vehicleDID) {
      const url = this.virtualCarWalletBaseUrl + `/api/v1/cars/${vin}`;
      const options = {
        json: true,
        headers: { apiKey: this.virtualCarWalletApiKey },
      };
      let vehicleDetails = {};
      try {
        vehicleDetails = await this.httpService
          .get(url, options)
          .toPromise()
          .then((res) => res.data);
        vehicleDetails['assetDID'] = vehicleDID;
      } catch (error) {
        this.logger.error('Error calling Virtual Car Wallet', error.message, error.stack);
        if (error.response && error.response.data && error.response.data.statusCode === 404) {
          throw new NotFoundException(error.response.data.message ? error.response.data.message : 'This vin has not yet been registered');
        } else {
          throw error;
        }
      }
      return vehicleDetails;
    } else {
      throw new NotFoundException('VehicleDID not found.');
    }
  }

  private async registerAddress(assetRegistration: IAssetRegistration): Promise<void> {
    const url = this.vehicleAuthorityBaseUrl + `/api/v1/registrations`;

    const options = {
      json: true,
      headers: {},
      body: assetRegistration,
    };

    try {
      await this.httpService
        .post(url, assetRegistration, options)
        .toPromise()
        .then((res) => res.data);
    } catch (error) {
      this.logger.error('Error calling Vehicle Authority', error.message, error.stack);
      throw error;
    }
  }

  private async registerTelematicsBox(telematicsRegistration: ITelematicsRegistration): Promise<void> {
    const url = this.virtualCarWalletBaseUrl + `/api/v1/cars`;

    const options = {
      json: true,
      headers: { apiKey: this.virtualCarWalletApiKey },
      body: telematicsRegistration,
    };

    try {
      await this.httpService
        .post(url, telematicsRegistration, options)
        .toPromise()
        .then((res) => res.data);
    } catch (error) {
      this.logger.error('Error calling Virtual Car Wallet', error.message, error.stack);
      throw error;
    }
  }

  public async updateTelematicsBox(vin: string, vehicleDetails: VehicleDetails): Promise<void> {
    const url = this.virtualCarWalletBaseUrl + `/api/v1/cars/` + vin;
    if (!vehicleDetails.zone && !vehicleDetails.thingId) {
      const defaultZone = this.config.getOrDefault('defaultZone', 'STUTTGART');
      vehicleDetails.zone = defaultZone;
    }
    const options = {
      json: true,
      headers: { apiKey: this.virtualCarWalletApiKey },
      body: vehicleDetails,
    };

    try {
      await this.httpService
        .put(url, vehicleDetails, options)
        .toPromise()
        .then((res) => res.data);
    } catch (error) {
      this.logger.error('Error calling Virtual Car Wallet', error.message, error.stack);
      throw error;
    }
  }

  private async verifyClaimedVin(vin: string): Promise<void> {
    const url = this.vehicleAuthorityBaseUrl + `/api/v1/registrations/${vin}`;
    const options = {
      json: true,
      headers: {},
    };

    let available = true;

    try {
      const response: any = await this.httpService
        .get(url, options)
        .toPromise()
        .then((res) => res.data)
        .catch((e) => {
          throw new HttpException(e.response.data, e.response.status);
        });
      this.logger.log(`VIN ${vin} already exists for asset ${response}`);
      available = false;
    } catch (error) {
      // we expect an 404 NotFound
      if (error.status === 404) {
        this.logger.log(`VIN ${vin} can be claimed`);
      } else {
        const msg = 'unexpected error calling vehicle authority';
        this.logger.error(msg, error);
        throw new InternalServerErrorException(msg);
      }
    }
    if (!available) {
      throw new NameAlreadyExistsException(vin);
    }
  }
}
