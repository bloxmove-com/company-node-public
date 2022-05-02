import { ApiProperty } from '@nestjs/swagger';

export class Session {
  @ApiProperty({})
  country_code: string;
  @ApiProperty({})
  party_id: string;
  @ApiProperty({})
  id: string;
  @ApiProperty({})
  commandId: string;
  @ApiProperty({})
  start_date_time: string;
  @ApiProperty({})
  location_id: string;
  @ApiProperty({})
  evse_uid: string;
  @ApiProperty({})
  connector_id: string;
  @ApiProperty({})
  end_date_time?: string;
  @ApiProperty({})
  kwh: number;
  @ApiProperty({})
  cdr_token;
  @ApiProperty({})
  auth_method;
  @ApiProperty({})
  authorization_reference?: string;
  @ApiProperty({})
  meter_id?: string;
  @ApiProperty({})
  currency: string;
  @ApiProperty({})
  charging_periods?;
  @ApiProperty({})
  total_cost?;
  @ApiProperty({})
  status;
  @ApiProperty({})
  last_updated: string;
}
