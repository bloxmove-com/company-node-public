import { ConflictException } from '@nestjs/common';

export class NameAlreadyExistsException extends ConflictException {
  constructor(name: string, asset?: string) {
    if (asset) {
      super(`The name ${name} already resolves to ${asset}.`);
    } else {
      super(`The name ${name} already resolves to another asset.`);
    }
  }
}
