import { DoorStatus, VehicleType } from '../enums';
import { VerifiablePresentation, VerifiableCredential } from '@bloxmove-com/did-asset-library-core-obfuscated';

export interface IVehicle {
  vin?: string;
  vehicleDID?: string;
  vehicleType?: VehicleType;
  batteryMaxCapacity?: string;
  brand: string;
  model: string;
  fuelType: string;
  numberOfDoors: number;
  numberOfSeats: number;
  transmission: string;
  licensePlate: string;
  imageUrl: string;
}

export interface IVehicleServiceAggregator {
  vehicleDID?: string;
  vehicleType?: VehicleType;
  batteryMaxCapacity?: string;
  brand?: string;
  model?: string;
  fuelType?: string;
  fuelLevel?: number;
  numberOfDoors?: number;
  numberOfSeats?: number;
  transmission?: string;
  licensePlate?: string;
  imageUrl?: string;
  packages?: IServicePackage[];
  locLat?: number;
  locLong?: number;
  fleetOwnerDID?: string;
  fleetOwnerName?: string;
  fleetNodeUrl?: string;
}

export interface ITelematicsRecord {
  vin: string;
  deviceId: string;
  data: ITelematicsRecordData;
  deviceSignature: string;
}

export interface ITelematicsRecordData {
  timestamp: number;
  locLat: number;
  locLong: number;
  mileage: number;
  fuelLevel: number;
  isDoorOpened: boolean;
}

export interface IVehicleStatus {
  vin: string;
  bookedSince?: number;
  bookedPackage?: number;
  latestTelematicsRecord: ITelematicsRecord;
}

export interface IRentalRequest {
  vehicleDID: string;
  consumerDID: string;
  packageId: number;
  verifiablePresentation: VerifiablePresentation | string;
}

export interface IContractDID {
  contractDID: string;
}

export interface IRentalConfirmation {
  verifiablePresentation: VerifiablePresentation | string;
}

export interface IAccessTokenResponse {
  verifiableCredentials: Array<VerifiableCredential | string>;
  endpoint: string;
}

export interface IRentalEndRequest {
  verifiablePresentation: VerifiablePresentation | string;
}

export interface IUsageData {
  rentalStartTime: number;
  rentalStartMileage: number;
  rentalDuration: number;
  rentalMileage: number;
  rentalEndTime: number;
  rentalEndMileage: number;
  rentalStartLocLat: number;
  rentalStartLocLong: number;
  rentalEndLocLat: number;
  rentalEndLocLong: number;
  finalPrice: number;
  priceComment?: string;
}

export interface IServicePackage {
  packageId: number;
  packageName: string;
  description: string;
  pricePerMinute: number;
  pricePerKm: number;
  termsConditions: string;
  validityPeriods: IValidityPeriods[];
  requiredUserClaims: string[];
  requiredBusinessClaims: string[];
  currency: string;
}

export interface IValidityPeriods {
  from: number;
  to: number;
}

export interface IServiceCatalogEntry extends IVehicle {
  status: IVehicleStatus;
  servicePackages: IServicePackage[];
}

export interface IVehicleContractData {
  vehicleDID?: string;
  packageId?: number;
  pricePerMinute?: number;
  pricePerKm?: number;
  termsConditions?: string;
  requiredUserClaims?: string[];
  requiredBusinessClaims?: string[];
  consumerDID?: string;
  bookingId?: string;
  currency?: string;
}

export interface IVehicleRegistration {
  vin: string;
  walletDIDs: string[];
  proofOfOwnership: string;
  zone?: string;
  thingId?: string;
}

export interface ITelematicsRegistration {
  vin: string;
  zone?: string;
  thingId?: string;
}

export interface IVehicleDID {
  vehicleDID: string;
}
export interface IVehicleDetails {
  zone?: string;
  thingId?: string;
  assetDID?: string;
}

export interface IDataProperties {
  [key: string]: any;
}

export interface IAssetRegistration {
  assetDID: string;
  proofOfOwnership: string;
  ownerSignature: string;
}

export interface IDoorStatusUpdateRequest {
  accessToken: VerifiablePresentation | string;
  status: DoorStatus;
}
