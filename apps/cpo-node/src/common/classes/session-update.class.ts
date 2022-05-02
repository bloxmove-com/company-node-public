import { ApiProperty } from '@nestjs/swagger';

export class SessionUpdate {
  @ApiProperty({ required: false })
  country_code: string;
  @ApiProperty({ required: false })
  party_id: string;
  @ApiProperty({ required: false })
  id: string;
  @ApiProperty({ required: false })
  start_date_time: string;
  @ApiProperty({ required: false })
  location_id: string;
  @ApiProperty({ required: false })
  evse_uid: string;
  @ApiProperty({ required: false })
  connector_id: string;
  @ApiProperty({ required: false })
  end_date_time: string;
  @ApiProperty({ required: false })
  kwh: number;
  @ApiProperty({ required: false })
  cdr_token;
  @ApiProperty({ required: false })
  auth_method: string;
  @ApiProperty({ required: false })
  authorization_reference: string;
  @ApiProperty({ required: false })
  meter_id: string;
  @ApiProperty({ required: false })
  currency: string;
  @ApiProperty({ isArray: true, required: false })
  charging_periods;
  @ApiProperty({ required: false })
  total_cost;
  @ApiProperty({ required: false })
  status: string;
  @ApiProperty({ required: false })
  last_updated: string;
}
