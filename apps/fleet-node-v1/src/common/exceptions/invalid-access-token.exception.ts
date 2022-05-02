import { ForbiddenException } from '@nestjs/common';

export class InvalidAccessToken extends ForbiddenException {
  constructor() {
    super('Invalid accessToken.');
  }
}
