import { ApiProperty } from '@nestjs/swagger';
import { IVehicleDID } from '../interfaces/interfaces';

export class VehicleDID implements IVehicleDID {
  constructor(vehicleDID: string) {
    this.vehicleDID = vehicleDID;
  }

  @ApiProperty({ type: String, description: 'The DID of the vehicle asset' })
  vehicleDID: string;
}
