import { ApiProperty } from '@nestjs/swagger';
import { IVehicleDetails } from '../interfaces/interfaces';

export class VehicleDetails implements IVehicleDetails {
  constructor(assetDID?: string, zone?: string, thingId?: string) {
    this.assetDID = assetDID;
    this.zone = zone;
    this.thingId = thingId;
  }

  @ApiProperty({ type: String, isArray: true, description: 'The asset DIDs', required: false })
  assetDID: string;

  @ApiProperty({ type: String, description: 'The zone of the vehicle to be set in the virtual car wallet', required: false })
  zone?: string;

  @ApiProperty({ type: String, description: 'The telematics box thingId to be set in the virtual car wallet', required: false })
  thingId?: string;
}
