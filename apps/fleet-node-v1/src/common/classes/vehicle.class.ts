import { ApiProperty } from '@nestjs/swagger';
import { IVehicle } from '../interfaces/interfaces';

export class Vehicle implements IVehicle {
  constructor(
    vin: string,
    vehicleDID: string,
    brand: string,
    model: string,
    fuelType: string,
    numberOfDoors: number,
    numberOfSeats: number,
    transmission: string,
    licensePlate: string,
    imageUrl: string,
  ) {
    this.vin = vin;
    this.vehicleDID = vehicleDID;
    this.brand = brand;
    this.model = model;
    this.fuelType = fuelType;
    this.numberOfDoors = numberOfDoors;
    this.numberOfSeats = numberOfSeats;
    this.transmission = transmission;
    this.licensePlate = licensePlate;
    this.imageUrl = imageUrl;
  }

  @ApiProperty({ type: String, description: 'The vin of the vehicle' })
  vin?: string;
  @ApiProperty({ type: String, description: 'The DID of the vehicle' })
  vehicleDID?: string;
  @ApiProperty({ type: String, description: 'The brand of the vehicle' })
  brand: string;
  @ApiProperty({ type: String, description: 'The model of the vehicle' })
  model: string;
  @ApiProperty({ type: String, description: 'The fuelType of the vehicle' })
  fuelType: string;
  @ApiProperty({ type: Number, description: 'The numberOfDoors of the vehicle' })
  numberOfDoors: number;
  @ApiProperty({ type: Number, description: 'The numberOfSeats of the vehicle' })
  numberOfSeats: number;
  @ApiProperty({ type: String, description: 'The transmission of the vehicle' })
  transmission: string;
  @ApiProperty({ type: String, description: 'The licensePlate of the vehicle' })
  licensePlate: string;
  @ApiProperty({ type: String, description: 'The imageUrl of the vehicle' })
  imageUrl: string;
}
