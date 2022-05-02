import { ApiProperty } from '@nestjs/swagger';
import { ITelematicsRecordData } from '../interfaces/interfaces';
import { IsInt, IsNumberString, IsBooleanString, IsNotEmpty } from 'class-validator';

export class TelematicsRecordData implements ITelematicsRecordData {
  constructor(timestamp: number, locLat: number, locLong: number, mileage: number, fuelLevel: number, isDoorOpened: boolean) {
    this.timestamp = timestamp;
    this.locLat = locLat;
    this.locLong = locLong;
    this.mileage = mileage;
    this.fuelLevel = fuelLevel;
    this.isDoorOpened = isDoorOpened;
  }

  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ type: Number, description: 'The vin of the vehicle' })
  timestamp: number;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({ type: Number, description: 'The Latitude of the current location of the vehicle' })
  locLat: number;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({ type: Number, description: 'The Longitude of the current location of the vehicle' })
  locLong: number;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({ type: Number, description: 'The current mileage of the vehicle in kilometers' })
  mileage: number;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({ type: Number, description: 'The fuel level of the vehicle' })
  fuelLevel: number;

  @IsBooleanString()
  @IsNotEmpty()
  @ApiProperty({ type: Boolean, description: 'The status of the door' })
  isDoorOpened: boolean;
}
