import { SwaggerAnnotatedVerifiablePresentation } from '@bloxmove-com/did-asset-library-nestjs-obfuscated';
import { VerifiablePresentation } from '@bloxmove-com/did-asset-library-core-obfuscated';
import { ApiProperty } from '@nestjs/swagger';
import { DoorStatus } from '../enums';
import { IDoorStatusUpdateRequest } from '../interfaces/interfaces';
import { CustomApiProperty } from '../decorators/custom-api-property.decorator';

export class DoorStatusUpdateRequest implements IDoorStatusUpdateRequest {
  constructor( accessToken: SwaggerAnnotatedVerifiablePresentation | string, status: DoorStatus) {
    this.accessToken = accessToken;
    this.status = status;
  }

  @CustomApiProperty({
    oneOf: [
      {
        type: 'SwaggerAnnotatedVerifiablePresentation',
      },
      {
        type: 'string',
      },
    ],
    required: true,
    description: 'The verifiable presentation to open or close the door in JSON-LD or JWT format',
  })
  accessToken: VerifiablePresentation | string;

  @ApiProperty({
    type: DoorStatus,
    enum: DoorStatus,
    description: 'the new status the door of the car should have',
  })
  status: DoorStatus;
}
