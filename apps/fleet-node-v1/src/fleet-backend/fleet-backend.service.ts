import { Injectable, Logger, NotFoundException, OnApplicationBootstrap, ForbiddenException, BadRequestException } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { HttpService } from '@nestjs/axios';
import {
  IServicePackage,
  IVehicleContractData,
  IVehicleStatus,
  IUsageData,
  ITelematicsRecord,
  IServiceCatalogEntry,
  IVehicleServiceAggregator,
  IVehicle,
} from '../common/interfaces/interfaces';
import { VehicleAlreadyBooked } from '../common/exceptions/vehicle-already-booked.exception';
import { VehicleAlreadyReleased } from '../common/exceptions/vehicle-already-released.exception';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BloxmoveTompGatewayService } from '../tomp/bloxmove-tomp-gateway.service';
import { ConfigService, PermissionsEnum, AssetService } from '@bloxmove-com/did-asset-library-core-obfuscated';

@Injectable()
export class FleetBackendService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FleetBackendService.name);
  private fleetbackendBaseUrl: string;
  private tenantId: string;
  private availableBackfillPackages: Map<number, IVehicleServiceAggregator> = new Map();
  private generatedResalePackages: Map<number, IServicePackage> = new Map();
  private vehicleDIDToEndPoint: Map<string, string> = new Map();
  private apiType: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    private readonly assetService: AssetService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly bloxmoveTompGatewayService: BloxmoveTompGatewayService,
  ) {
    this.apiType = this.config.getOrDefault('apiType', 'fleet-backend');

    if (this.apiType === 'fleet-backend') {
      this.fleetbackendBaseUrl = this.config.getOrThrow('fleetbackendBaseUrl');
      this.tenantId = this.config.get('fleetBackendTenantId');
    }
  }

  public async onApplicationBootstrap(): Promise<void> {
    if (this.config.get('backfillEnabled') === 'true') {
      this.logger.log('backfillEnabled: true');
      this.logger.log('initializing backfill packages and registering interval');

      await this.updateBackfillPackages();
      const interval = setInterval(() => this.updateBackfillPackages(), Number(this.config.get('backfillUpdateInterval')));
      this.schedulerRegistry.addInterval('backfill-packages-interval', interval);
    } else {
      this.logger.log('backfillEnabled: false');
    }
  }

  async updateBackfillPackages() {
    const filter = { channel: 'B2B' };
    const url = `${this.config.get('serviceCatalogAggregatorBaseUrl')}/api/v1/service-catalog?filter=${JSON.stringify(filter)}`;
    const options = {
      json: true,
      headers: {
        apiKey: this.config.get('serviceCatalogAggregatorApiKey'),
      },
    };
    try {
      this.logger.log('updating backfill packages');
      let backfillVehicles: IVehicleServiceAggregator[] = await this.httpService
        .get(url, options)
        .toPromise()
        .then((res) => res.data);
      // filter for external backfill packages
      backfillVehicles = backfillVehicles.filter((vehicle) => vehicle.fleetOwnerDID !== this.config.get('accountDID'));
      // clear map with current backfill packages
      this.availableBackfillPackages.clear();
      // generate flattened map for backfill packages
      if (backfillVehicles && backfillVehicles.length > 0) {
        backfillVehicles.forEach((vehicle) => {
          // add endpoint to map
          this.vehicleDIDToEndPoint.set(vehicle.vehicleDID, vehicle.fleetNodeUrl);
          const servicePackages = vehicle.packages;
          servicePackages.forEach((servicePackage) => {
            const determinedPackageId = this.determinePackageId(vehicle.fleetOwnerDID.concat(vehicle.vehicleDID), servicePackage.packageId);
            const flattenedVehicle = Object.assign({}, vehicle);
            flattenedVehicle.packages = [servicePackage];
            this.availableBackfillPackages.set(determinedPackageId, flattenedVehicle);
          });
        });
      } else {
        this.logger.debug('No backfill packages found');
      }
    } catch (error) {
      this.logger.error('Error retrieving backfill packages from service-catalog-aggregator', error);
    }
  }

  public async getServiceCatalog() {
    if (this.apiType === 'tomp') {
      this.logger.log(`Get the service catalog TOMP`);
      return this.bloxmoveTompGatewayService.getTompServiceCatalog();
    }
    this.logger.log(`Get the service catalog bloxmove`);
    return this.getServiceCatalogFromBackendRequest(true);
  }

  public async getServiceCatalogFromBackendRequest(withConvertToDID: boolean): Promise<IServiceCatalogEntry[]> {
    const url = this.fleetbackendBaseUrl + '/api/v1/service-catalog';
    const options = await this.getFleetBackendRequestOptions();
    try {
      const httpResult = await this.httpService
        .get(url, options)
        .toPromise()
        .then((res) => res.data);
      this.logger.debug('The service catalog entries have been retrieved from backend');
      if (withConvertToDID) {
        const entries: IServiceCatalogEntry[] = await this.extractVehicleDIDFromVin(httpResult);
        const backfillEnabled = this.config.get('backfillEnabled');
        this.logger.debug(`Backfill enabled: ${backfillEnabled}`);
        if (backfillEnabled === 'true') {
          this.logger.debug(`Attempting to generate resale packages.`);
          // add generated resale packages to the service catalog entries
          this.generateAndMergeResaleServiceCatalog(entries);
        }
        return entries;
      }
      return httpResult;
    } catch (error) {
      this.logger.error('Error by find entries', error);
      throw error;
    }
  }

  private async extractVehicleDIDFromVin(entries: IServiceCatalogEntry[]): Promise<IServiceCatalogEntry[]> {
    const catalogEntries: IServiceCatalogEntry[] = [];
    for (const entry of entries) {
      const name = entry.vin + '.' + this.config.get('vehicleAuthorityVehicleParentDomain');
      const vehicleDID = await this.assetService.resolveName(name);
      if (vehicleDID) {
        entry.vehicleDID = vehicleDID;
        catalogEntries.push(entry);
      }
    }
    return catalogEntries;
  }

  private async setVehicleStatusToBookedRequest(vin: string, packageId: number): Promise<void> {
    const url = this.fleetbackendBaseUrl + `/api/v1/vehicles/${vin}/book/${packageId}`;
    const options = await this.getFleetBackendRequestOptions();
    try {
      const httpResult = await this.httpService
        .post(url, null, options)
        .toPromise()
        .then((res) => res.data);
      this.logger.log('The status of vehicle ' + vin + ' has been changed to booked');
      return httpResult;
    } catch (error) {
      this.logger.error('Error by setting the status of vehicle: ' + vin + ' to booked', error);
      throw error;
    }
  }

  private async getVehicleStatusRequest(vin: string): Promise<IVehicleStatus> {
    const url = this.fleetbackendBaseUrl + `/api/v1/vehicles/${vin}/status`;
    const options = await this.getFleetBackendRequestOptions();
    try {
      const httpResult = await this.httpService
        .get(url, options)
        .toPromise()
        .then((res) => res.data);
      this.logger.log(`The status of vehicle ' + ${vin} + ' has been retrieved: ${JSON.stringify(httpResult)}`);
      return httpResult;
    } catch (error) {
      this.logger.error('Error by getting the status of vehicle: ' + vin, error);
      throw error;
    }
  }

  private async releaseVehicleRequest(vin: string): Promise<IUsageData> {
    const url = this.fleetbackendBaseUrl + `/api/v1/vehicles/${vin}/release`;
    const options = await this.getFleetBackendRequestOptions();
    try {
      const httpResult = await this.httpService
        .post(url, null, options)
        .toPromise()
        .then((res) => res.data);
      this.logger.log('The vehicle ' + vin + ' has been released');
      return httpResult;
    } catch (error) {
      this.logger.error('Error by release vehicle: ' + vin, error);
      throw error;
    }
  }

  private async setTelematicsDataRequest(vin: string, telematicsData: ITelematicsRecord): Promise<void> {
    const url = this.fleetbackendBaseUrl + `/api/v1/vehicles/${vin}/telematics-data`;
    const options = await this.getFleetBackendRequestOptions(telematicsData);
    try {
      const httpResult = await this.httpService
        .post(url, telematicsData, options)
        .toPromise()
        .then((res) => res.data);
      this.logger.log('The telematics data has been set');
      return httpResult;
    } catch (error) {
      this.logger.error('Error by set telematics data: ' + telematicsData.vin, error);
      throw error;
    }
  }

  async getRentalRelevantDataFromFleetBackend(vin: string, packageId: number): Promise<IVehicleContractData> {
    const catalogEntries: IServiceCatalogEntry[] = await this.getServiceCatalogFromBackendRequest(false);
    const entry: IServiceCatalogEntry = catalogEntries.find((e) => e.vin === vin);
    if (!entry || !entry.servicePackages) {
      throw new NotFoundException('Catalog has no entries');
    }
    if (entry.status && entry.status.bookedSince && entry.status.bookedSince !== 0) {
      throw new VehicleAlreadyBooked(vin);
    }
    const packages: IServicePackage[] = entry.servicePackages;
    const bookedPackage: IServicePackage = packages.find((p) => entry && p.packageId === packageId);
    if (!bookedPackage) {
      throw new BadRequestException('requested service package does not exist');
    }
    const vehicleContractData: IVehicleContractData = {
      packageId,
      pricePerKm: bookedPackage.pricePerKm,
      pricePerMinute: bookedPackage.pricePerMinute,
      requiredUserClaims: bookedPackage.requiredUserClaims,
      requiredBusinessClaims: bookedPackage.requiredBusinessClaims,
      termsConditions: bookedPackage.termsConditions,
      currency: bookedPackage.currency,
    };
    return vehicleContractData;
  }

  async bookVehicle(vehicleDID: string, packageId: number): Promise<void> {
    const vin: string = await this.assetService.getDataProperty(vehicleDID, 'vin');
    const vehicleStatus: IVehicleStatus = await this.getVehicleStatusRequest(vin);
    if (vehicleStatus.bookedSince !== 0) {
      throw new VehicleAlreadyBooked(vin);
    }
    await this.setVehicleStatusToBookedRequest(vin, packageId);
  }

  async releaseVehicle(vehicleDID: string): Promise<IUsageData> {
    const vin: string = await this.assetService.getDataProperty(vehicleDID, 'vin');
    const vehicleStatus: IVehicleStatus = await this.getVehicleStatusRequest(vin);
    if (vehicleStatus.bookedSince === 0) {
      throw new VehicleAlreadyReleased(vin);
    }
    return await this.releaseVehicleRequest(vin);
  }

  async addTelematicData(vin: string, telematicData: ITelematicsRecord): Promise<void> {
    const vehicleName = vin + '.' + this.config.get('vehicleAuthorityVehicleParentDomain');
    const vehicleAssetDID = await this.assetService.resolveName(vehicleName);
    if (!vehicleAssetDID) {
      throw new NotFoundException(`unknown vehicle VIN: ${vin}`);
    }
    const involvedParties = await this.assetService.getInvolvedParties(vehicleAssetDID, PermissionsEnum.SIGNER);
    let signer: string;
    for (const involvedParty of involvedParties) {
      try {
        if (await this.assetService.verifySignature(involvedParty, JSON.stringify(telematicData.data), telematicData.deviceSignature)) {
          signer = involvedParty;
          break;
        }
      } catch (error) {
        this.logger.debug('error verifying signature', error);
        throw new BadRequestException();
      }
    }
    if (signer) {
      this.logger.debug(`deviceSignature valid, signer: ${signer}`);
      await this.setTelematicsDataRequest(vin, telematicData);
    } else {
      throw new ForbiddenException();
    }
  }

  private determinePackageId(providerAndVehicleDID: string, providerPackageId: number): number {
    const hashCode = this.hashCode(providerAndVehicleDID);
    const packageId = hashCode + providerPackageId;
    return packageId;
  }

  private generateAndMergeResaleServiceCatalog(entries: IServiceCatalogEntry[]) {
    this.logger.debug(`number of backfill packages: ${this.availableBackfillPackages.size}`);
    const vehicleDIDToGeneratedPackageIds: Map<string, number[]> = new Map();
    this.availableBackfillPackages.forEach((value, key) => {
      const packageIds = vehicleDIDToGeneratedPackageIds.get(value.vehicleDID);
      if (packageIds) {
        packageIds.push(key);
      } else {
        vehicleDIDToGeneratedPackageIds.set(value.vehicleDID, [key]);
      }
    });
    this.generateServiceCatalogEntries(vehicleDIDToGeneratedPackageIds, entries);
  }

  private generateServiceCatalogEntries(vehicleDIDToGeneratedPackageIds: any, entries: IServiceCatalogEntry[]) {
    this.logger.debug('generating service catalog entries ...');
    const requiredUserClaims: string[] = this.config.get('resalePackageClaims').split(',');
    this.logger.debug(`required user claims for resale packages: ${requiredUserClaims}`);
    vehicleDIDToGeneratedPackageIds.forEach((value, key) => {
      // we use the first entry for the general vehicle data
      const vehiclePackageData = this.availableBackfillPackages.get(value[0]);
      const vehicleData: IVehicle = {
        brand: vehiclePackageData.brand,
        fuelType: vehiclePackageData.fuelType,
        imageUrl: vehiclePackageData.imageUrl,
        licensePlate: vehiclePackageData.licensePlate,
        model: vehiclePackageData.model,
        numberOfDoors: vehiclePackageData.numberOfDoors,
        numberOfSeats: vehiclePackageData.numberOfSeats,
        transmission: vehiclePackageData.transmission,
        vehicleDID: key,
        vehicleType: vehiclePackageData.vehicleType,
        batteryMaxCapacity: vehiclePackageData.batteryMaxCapacity,
      };
      const vehicleStatus: IVehicleStatus = {
        bookedSince: 0,
        latestTelematicsRecord: {
          vin: undefined, // TODO ok?
          deviceId: undefined,
          deviceSignature: undefined,
          data: {
            fuelLevel: vehiclePackageData.fuelLevel,
            isDoorOpened: false,
            locLat: vehiclePackageData.locLat,
            locLong: vehiclePackageData.locLong,
            mileage: undefined, // TODO ok?
            timestamp: undefined, // TODO ok?
          },
        },
        vin: undefined, // TODO ok?
      };
      const servicePackages: IServicePackage[] = [];
      value.forEach((resalePackageId) => {
        const backfillPackage = this.availableBackfillPackages.get(resalePackageId).packages[0];
        const resalePackage: IServicePackage = {
          packageId: resalePackageId,
          description: backfillPackage.description,
          packageName: backfillPackage.packageName,
          pricePerKm: backfillPackage.pricePerKm * 1.075, // we increase the price by 7,5%
          pricePerMinute: backfillPackage.pricePerMinute * 1.075, // we increase the price by 7,5%
          requiredBusinessClaims: [],
          requiredUserClaims,
          termsConditions: backfillPackage.termsConditions,
          validityPeriods: backfillPackage.validityPeriods,
          currency: backfillPackage.currency,
        };
        // add generated resale packages to list to be able to verify the requiredUserClaims later on
        this.generatedResalePackages.set(resalePackageId, resalePackage);
        servicePackages.push(resalePackage);
      });
      const resaleCatalogEntry: IServiceCatalogEntry = { ...vehicleData, status: vehicleStatus, servicePackages };
      entries.push(resaleCatalogEntry);
    });
  }

  async getLoginToken() {
    const url = this.fleetbackendBaseUrl + `/api/v1/users/login`;
    let options;
    let email;
    let password;

    if (this.tenantId) {
      options = {
        json: true,
        headers: {
          tenantid: this.tenantId,
        },
      };
    } else {
      options = {
        json: true,
      };
    }

    if (this.apiType === 'fleet-backend') {
      email = this.config.getOrThrow('fleetBackendUser');
      password = this.config.getOrThrow('fleetBackendPassword');
    }

    try {
      const httpResult = await this.httpService
        .post(url, { email, password }, options)
        .toPromise()
        .then((res) => res.data);
      return httpResult.accessToken;
    } catch (error) {
      this.logger.error('Error by login in to the fleet backend', error);
      throw error;
    }
  }

  async getFleetBackendRequestOptions(body?) {
    let options;
    if (this.tenantId) {
      options = {
        json: true,
        headers: {
          authorization: 'Bearer ' + (await this.getLoginToken()),
          tenantid: this.tenantId,
        },
        body,
      };
    } else {
      options = {
        json: true,
        headers: {
          authorization: 'Bearer ' + (await this.getLoginToken()),
        },
        body,
      };
    }
    return options;
  }

  getResalePackage(generatedPackageId: number): IServicePackage {
    return this.generatedResalePackages.get(generatedPackageId);
  }

  getBackfillPackage(packageId: number): IVehicleServiceAggregator {
    return this.availableBackfillPackages.get(packageId);
  }

  async getFleetNodeUrl(vehicleDID: string): Promise<string> {
    let fleetNodeUrl = this.vehicleDIDToEndPoint.get(vehicleDID);
    // after restart or crash while the vehicle is booked, the url information must be fetched again through DID doc
    if (!fleetNodeUrl) {
      const vehicleOwnerDID = await this.assetService.getOwner(vehicleDID);
      if (!vehicleOwnerDID) {
        throw new Error('Vehicle owner not found for DID ' + vehicleDID);
      }
      const vehicleOwnerDIDDocument = await this.assetService.getDIDDocument(vehicleOwnerDID);
      const fleetNodeService = vehicleOwnerDIDDocument.service.find((service) => service.type === 'fleetNode');
      if (!fleetNodeService) {
        throw new Error('Fleet Node Service Endpoint not found for DID ' + vehicleOwnerDID);
      }
      fleetNodeUrl = fleetNodeService.serviceEndpoint as string;
      this.vehicleDIDToEndPoint.set(vehicleDID, fleetNodeUrl);
    }
    return fleetNodeUrl;
  }

  setBackfillPackageBooked(packageId: number) {
    // packageId mustn't appear in the availableBackfillPackages anymore
    this.availableBackfillPackages.delete(packageId);
  }

  private hashCode(s: string): number {
    let h;
    /* tslint:disable:no-bitwise */
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return h >>> 0;
    /* tslint:enable:no-bitwise */
  }
}
