import { ForbiddenException } from '@nestjs/common';

export class WrongPackageData extends ForbiddenException {
  constructor() {
    super(`Error: The used data in package flow is not correct!`);
  }
}
