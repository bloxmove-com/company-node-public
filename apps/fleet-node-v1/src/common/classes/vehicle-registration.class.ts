import { ApiProperty } from '@nestjs/swagger';
import { IVehicleRegistration } from '../interfaces/interfaces';
import { IsNotEmpty, IsArray, ArrayNotEmpty } from 'class-validator';

export class VehicleRegistration implements IVehicleRegistration {
  constructor(vin: string, walletDIDs: string[], proofOfOwnership: string, zone?: string, thingId?: string) {
    this.vin = vin;
    this.walletDIDs = walletDIDs;
    this.proofOfOwnership = proofOfOwnership;
    this.zone = zone;
    this.thingId = thingId;
  }

  @IsNotEmpty()
  @ApiProperty({ type: String, description: 'The vin of the vehicle' })
  vin: string;

  @IsArray()
  @ArrayNotEmpty()
  @ApiProperty({ type: String, isArray: true, description: 'The wallet DIDs' })
  walletDIDs: string[];

  @IsNotEmpty()
  @ApiProperty({ type: String, description: 'The proof of ownership' })
  proofOfOwnership: string;

  @ApiProperty({ type: String, description: 'The zone of the vehicle to be set in the virtual car wallet', required: false })
  zone?: string;

  @ApiProperty({ type: String, description: 'The telematics box thingId to be set in the virtual car wallet', required: false })
  thingId?: string;
}
