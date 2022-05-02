import { ApiProperty } from '@nestjs/swagger';
import { ITelematicsRecord } from '../interfaces/interfaces';
import { TelematicsRecordData } from './telematic-record-data.class';
import { IsNotEmpty, IsInstance } from 'class-validator';

export class TelematicsRecord implements ITelematicsRecord {
  constructor(vin: string, deviceId: string, data: TelematicsRecordData, deviceSignature: string) {
    this.vin = vin;
    this.deviceId = deviceId;
    this.data = data;
    this.deviceSignature = deviceSignature;
  }

  @IsNotEmpty()
  @ApiProperty({ type: String, description: 'The vin of the vehicle' })
  vin: string;

  @IsNotEmpty()
  @ApiProperty({ type: String, description: 'The deviceId' })
  deviceId: string;

  @IsInstance(TelematicsRecordData)
  @ApiProperty({ type: TelematicsRecordData, description: 'The TelematicsRecordData' })
  data: TelematicsRecordData;

  @IsNotEmpty()
  @ApiProperty({ type: String, description: 'The deviceSignature' })
  deviceSignature: string;
}
