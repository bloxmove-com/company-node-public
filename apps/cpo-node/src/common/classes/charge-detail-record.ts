import { ApiProperty } from '@nestjs/swagger';

export class ChargeDetailRecord {
  @ApiProperty({})
  country_code: string;
  @ApiProperty({})
  party_id: string;
  @ApiProperty({})
  id: string;
  @ApiProperty({})
  start_date_time: string;
  @ApiProperty({})
  end_date_time: string;
  @ApiProperty({ required: false })
  session_id?: string;
  @ApiProperty({})
  cdr_token;
  @ApiProperty({})
  auth_method: string;
  @ApiProperty({ required: false })
  authorization_reference?: string;
  @ApiProperty({})
  cdr_location;
  @ApiProperty({ required: false })
  meter_id?: string;
  @ApiProperty({})
  currency: string;
  @ApiProperty({ required: false })
  tariffs?;
  @ApiProperty({ isArray: true })
  charging_periods;
  @ApiProperty({ required: false })
  signed_data?;
  @ApiProperty({})
  total_cost;
  @ApiProperty({ required: false })
  total_fixed_cost;
  @ApiProperty({})
  total_energy: number;
  @ApiProperty({ required: false })
  total_energy_cost;
  @ApiProperty({})
  total_time: number;
  @ApiProperty({ required: false })
  total_time_cost;
  @ApiProperty({ required: false })
  total_parking_time?: number;
  @ApiProperty({ required: false })
  total_parking_cost?;
  @ApiProperty({ required: false })
  total_reservation_cost?;
  @ApiProperty({ required: false })
  remark?: string;
  @ApiProperty({ required: false })
  invoice_reference_id?: string;
  @ApiProperty({ required: false })
  credit?: boolean;
  @ApiProperty({ required: false })
  credit_reference_id?: string;
  @ApiProperty({})
  last_updated: string;
}
