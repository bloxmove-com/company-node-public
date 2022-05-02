import { ForbiddenException } from '@nestjs/common';

export class ConsumerTopicsAttestationFailedException extends ForbiddenException {
  constructor(consumerDID: string, message: string) {
    super(`Attestation failed for consumer with DID: ${consumerDID}, cause: ${message}`);
  }
}
