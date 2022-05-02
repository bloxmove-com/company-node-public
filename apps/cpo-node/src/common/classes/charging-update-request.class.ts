import { ApiProperty } from '@nestjs/swagger';
import { SessionUpdate } from './session-update.class';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { VerifiablePresentation } from '@bloxmove-com/did-asset-library-core-obfuscated';

export class ChargingUpdateRequest {
  @ApiProperty({})
  @IsNotEmpty()
  session: SessionUpdate;

  @ApiProperty({})
  @IsNotEmpty()
  contractDID: string;

  @ApiProperty({required: false})
  @IsOptional()
  vp?: VerifiablePresentation
}
