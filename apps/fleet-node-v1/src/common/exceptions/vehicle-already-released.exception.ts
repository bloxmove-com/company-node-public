import { ConflictException } from '@nestjs/common';

export class VehicleAlreadyReleased extends ConflictException {
  constructor(vin: string) {
    super(`The vehicle ${vin} is already released.`);
  }
}
