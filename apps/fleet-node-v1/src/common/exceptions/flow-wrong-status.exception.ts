import { HttpException } from '@nestjs/common';

export class FlowWrongStatus extends HttpException {
  constructor(status: string) {
    super(`Error: Flow is not in status ${status}`, 423);
  }
}
