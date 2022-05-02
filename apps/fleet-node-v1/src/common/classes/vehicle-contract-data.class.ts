import { ApiProperty } from '@nestjs/swagger';
import { IVehicleContractData } from '../interfaces/interfaces';

export class VehicleContractData implements IVehicleContractData {
  constructor(
    vehicleDID: string,
    pricePerKm: number,
    pricePerMinute: number,
    termsConditions: string,
    requiredUserClaims: string[],
    consumerDID: string,
    currency: string,
  ) {
    this.vehicleDID = vehicleDID;
    this.pricePerKm = pricePerKm;
    this.pricePerMinute = pricePerMinute;
    this.termsConditions = termsConditions;
    this.requiredUserClaims = requiredUserClaims;
    this.consumerDID = consumerDID;
    this.currency = currency;
  }

  @ApiProperty({ type: String, description: 'The DID of the vehicle' })
  vehicleDID: string;
  @ApiProperty({ type: String, description: 'The ID of the booked service package' })
  packageId: number;
  @ApiProperty({ type: String, description: 'The pricePerMinute' })
  pricePerMinute: number;
  @ApiProperty({ type: String, description: 'The pricePerKm' })
  pricePerKm: number;
  @ApiProperty({ type: String, description: 'The hash of the termsConditions' })
  termsConditions: string;
  @ApiProperty({ type: String, isArray: true, description: 'The required UserClaims of the vehicle' })
  requiredUserClaims: string[];
  @ApiProperty({ type: String, description: 'The user DID' })
  consumerDID: string;
  @ApiProperty({ type: String, description: 'The currency in which the service package is paid for' })
  currency: string;
}
