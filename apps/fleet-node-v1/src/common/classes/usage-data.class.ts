import { ApiProperty } from '@nestjs/swagger';
import { IUsageData } from '../interfaces/interfaces';

export class UsageData implements IUsageData {
  constructor(
    vin: string,
    vehicleDID: string,
    rentalStartTime: number,
    rentalStartMileage: number,
    rentalDuration: number,
    rentalMileage: number,
    rentalEndTime: number,
    rentalEndMileage: number,
    rentalStartLocLat: number,
    rentalStartLocLong: number,
    rentalEndLocLat: number,
    rentalEndLocLong: number,
    finalPrice: number,
    priceComment: string,
  ) {
    this.vin = vin;
    this.vehicleDID = vehicleDID;
    this.rentalStartTime = rentalStartTime;
    this.rentalStartMileage = rentalStartMileage;
    this.rentalDuration = rentalDuration;
    this.rentalMileage = rentalMileage;
    this.rentalEndTime = rentalEndTime;
    this.rentalEndMileage = rentalEndMileage;
    this.rentalStartLocLat = rentalStartLocLat;
    this.rentalStartLocLong = rentalStartLocLong;
    this.rentalEndLocLat = rentalEndLocLat;
    this.rentalEndLocLong = rentalEndLocLong;
    this.finalPrice = finalPrice;
    this.priceComment = priceComment;
  }

  @ApiProperty({ type: String, description: 'The vin of the vehicle' })
  vin: string;
  @ApiProperty({ type: String, description: 'The DID of the vehicle' })
  vehicleDID: string;
  @ApiProperty({ type: Number, description: 'The timestamp (UTC seconds) when the rent started' })
  rentalStartTime: number;
  @ApiProperty({ type: Number, description: 'The mileage (in km) of the time when the rent started' })
  rentalStartMileage: number;
  @ApiProperty({ type: Number, description: 'The total duration of the rent in minutes' })
  rentalDuration: number;
  @ApiProperty({ type: Number, description: 'The total mileage of the rent in km' })
  rentalMileage: number;
  @ApiProperty({ type: Number, description: 'The timestamp (UTC seconds) when the rent ended' })
  rentalEndTime: number;
  @ApiProperty({ type: Number, description: 'Mileage (in km) of the time when the rent ended' })
  rentalEndMileage: number;
  @ApiProperty({ type: Number, description: 'The latitude of the location where the rent started' })
  rentalStartLocLat: number;
  @ApiProperty({ type: Number, description: 'The longitude of the location where the rent started' })
  rentalStartLocLong: number;
  @ApiProperty({ type: Number, description: 'The latitude of the location where the rent ended' })
  rentalEndLocLat: number;
  @ApiProperty({ type: Number, description: 'The longitude of the location where the rent ended' })
  rentalEndLocLong: number;
  @ApiProperty({ type: Number, description: 'The final price of the rent in the currency specified in the contract data' })
  finalPrice: number;
  @ApiProperty({ type: String, description: 'The optional comment related to the final price', required: false })
  priceComment?: string;
}
