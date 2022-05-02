import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ContractDID {
  @ApiProperty({})
  @IsNotEmpty()
  contractDID: string;
}
