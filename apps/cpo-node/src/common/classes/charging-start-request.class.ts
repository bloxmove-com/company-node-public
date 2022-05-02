import { ApiProperty } from '@nestjs/swagger';
import { Session } from './session.class';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { VerifiablePresentation } from '@bloxmove-com/did-asset-library-core-obfuscated';

export class ChargingStartRequest {
  @ApiProperty({})
  @IsNotEmpty()
  session: Session;
  @ApiProperty({})
  @IsNotEmpty()
  contractDID: string;
  @ApiProperty({required: false})
  @IsOptional()
  vp?: VerifiablePresentation
}
