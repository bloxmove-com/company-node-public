import { ApiProperty } from '@nestjs/swagger';

export class Session {
  @ApiProperty({})
  country_code: string;
  @ApiProperty({})
  party_id: string;
  @ApiProperty({})
  id: string;
  @ApiProperty({})
  start_date_time: string;
  @ApiProperty({})
  location_id: string;
  @ApiProperty({})
  evse_uid: string;
  @ApiProperty({})
  connector_id: string;
  @ApiProperty({ required: false })
  end_date_time?: string;
  @ApiProperty({})
  kwh: number;
  @ApiProperty({})
  cdr_token;
  @ApiProperty({})
  auth_method: string;
  @ApiProperty({ required: false })
  authorization_reference?: string;
  @ApiProperty({ required: false })
  meter_id?: string;
  @ApiProperty({})
  currency: string;
  @ApiProperty({ isArray: true, required: false })
  charging_periods?;
  @ApiProperty({ required: false })
  total_cost?;
  @ApiProperty({})
  status: string;
  @ApiProperty({})
  last_updated: string;
}
