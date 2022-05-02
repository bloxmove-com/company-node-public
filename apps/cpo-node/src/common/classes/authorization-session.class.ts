import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class AuthorizationSession {
  @ApiProperty({})
  @IsNotEmpty()
  country_code: string;
  @ApiProperty({})
  @IsNotEmpty()
  party_id: string;
  @ApiProperty({ required: false })
  id?: string;
  @ApiProperty({ required: false })
  start_date_time?: string;
  @ApiProperty({})
  @IsNotEmpty()
  location_id: string;
  @ApiProperty({})
  @IsNotEmpty()
  evse_uid: string;
  @IsNotEmpty()
  @ApiProperty({})
  connector_id: string;
  @ApiProperty({ required: false })
  kwh?: string;
}
