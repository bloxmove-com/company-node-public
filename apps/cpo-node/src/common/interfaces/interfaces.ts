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

export interface IDataProperties {
  [key: string]: any;
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

export interface ICallbackUrl {
  url: string;
}
