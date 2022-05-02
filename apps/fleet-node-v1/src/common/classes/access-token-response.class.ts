import { ApiProperty } from '@nestjs/swagger';
import { IAccessTokenResponse } from '../interfaces/interfaces';
import { SwaggerAnnotatedVerifiableCredential } from '@bloxmove-com/did-asset-library-nestjs-obfuscated';
import { VerifiableCredential } from '@bloxmove-com/did-asset-library-core-obfuscated';
import { CustomApiProperty } from '../decorators/custom-api-property.decorator';

export class AccessTokenResponse implements IAccessTokenResponse {
  constructor(verifiableCredentials: Array<SwaggerAnnotatedVerifiableCredential | string>, endpoint: string) {
    this.verifiableCredentials = verifiableCredentials;
    this.endpoint = endpoint;
  }

  @ApiProperty({ type: String, description: 'The car wallet endpoint to send the token to' })
  endpoint: string;

  @CustomApiProperty({
    type: 'array',
    items: {
      oneOf: [{ type: 'SwaggerAnnotatedVerifiableCredential' }, { type: 'string' }],
    },
    description: 'The verifiable credentials to open or close the door in JSON-LD or JWT format',
  })
  verifiableCredentials: Array<VerifiableCredential | string>;
}
