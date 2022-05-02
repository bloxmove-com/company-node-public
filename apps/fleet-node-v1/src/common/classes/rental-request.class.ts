import { SwaggerAnnotatedVerifiablePresentation } from '@bloxmove-com/did-asset-library-nestjs-obfuscated';
import { VerifiablePresentation } from '@bloxmove-com/did-asset-library-core-obfuscated';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Min, IsInt } from 'class-validator';
import { IRentalRequest } from '../interfaces/interfaces';
import { CustomApiProperty } from '../decorators/custom-api-property.decorator';

export class RentalRequest implements IRentalRequest {
  constructor(vehicleDID: string, consumerDID: string, packageId: number, verifiablePresentation: SwaggerAnnotatedVerifiablePresentation | string) {
    this.vehicleDID = vehicleDID;
    this.consumerDID = consumerDID;
    this.packageId = packageId;
    this.verifiablePresentation = verifiablePresentation;
  }

  @IsNotEmpty()
  @ApiProperty({ type: String, description: 'The DID of the vehicle' })
  vehicleDID: string;

  @IsNotEmpty()
  @ApiProperty({ type: String, description: 'The DID of the consumer' })
  consumerDID: string;

  @Min(1)
  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ type: Number, description: 'The package Id of the Vehicle' })
  packageId: number;

  @CustomApiProperty({
    oneOf: [
      {
        type: 'SwaggerAnnotatedVerifiablePresentation',
      },
      {
        type: 'string',
      },
    ],
    required: false,
    description: 'Verifiable Presentation containing consumer claims as Verifiable Credentials signed by consumer, either in JSON-LD or JWT String.',
  })
  verifiablePresentation: VerifiablePresentation | string;
}
