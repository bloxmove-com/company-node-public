import { ApiProperty } from '@nestjs/swagger';
import { IContractDID } from '../interfaces/interfaces';

export class ContractDID implements IContractDID {
  constructor(contractDID: string) {
    this.contractDID = contractDID;
  }

  @ApiProperty({ type: String, description: 'The Vin of the vehicle' })
  contractDID: string;
}
