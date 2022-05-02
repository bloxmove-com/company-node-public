import { SwaggerAnnotatedVerifiablePresentation } from '@bloxmove-com/did-asset-library-nestjs-obfuscated';
import { VerifiablePresentation } from '@bloxmove-com/did-asset-library-core-obfuscated';
import { CustomApiProperty } from '../decorators/custom-api-property.decorator';

export class AccessTokenRequest {
    constructor(verifiablePresentation: SwaggerAnnotatedVerifiablePresentation) {
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
    })
    verifiablePresentation: VerifiablePresentation;
}
