import { ApiProperty } from '@nestjs/swagger';
import { ChargeDetailRecord } from './charge-detail-record';
import { Session } from './session.class';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { VerifiablePresentation } from '@bloxmove-com/did-asset-library-core-obfuscated';

export class ChargingEndRequest {
  @ApiProperty({})
  @IsNotEmpty()
  session: Session;

  @ApiProperty({})
  @IsNotEmpty()
  chargeDetailRecord: ChargeDetailRecord;

  @ApiProperty({})
  @IsNotEmpty()
  contractDID: string;

  @ApiProperty({required: false})
  @IsOptional()
  vp?: VerifiablePresentation
}
