import { SwaggerAnnotatedVerifiableCredential, SwaggerAnnotatedVerifiablePresentation } from '@bloxmove-com/did-asset-library-nestjs-obfuscated';
import { VerifiableCredential, VerifiablePresentation } from '@bloxmove-com/did-asset-library-core-obfuscated';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { CustomApiProperty } from '../decorators/custom-api-property.decorator';
import { IRentalEndRequest } from '../interfaces/interfaces';

export class RentalEndRequest implements IRentalEndRequest {
  constructor(verifiablePresentation: SwaggerAnnotatedVerifiablePresentation | string) {
    this.verifiablePresentation = verifiablePresentation;
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
    description: 'A Verifiable Presentation containing the consumer confirmation (JSON-LD or JWT String)',
    required: true,
  })
  verifiablePresentation: VerifiablePresentation | string;
}
