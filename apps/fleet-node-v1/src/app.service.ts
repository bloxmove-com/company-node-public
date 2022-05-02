import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@bloxmove-com/did-asset-library-core-obfuscated';

@Injectable()
export class AppService {
  constructor(private config: ConfigService) {
    Logger.log('Running in ' + this.config.get('ENV') + ' mode!');
  }

  isRunning(): string {
    return 'Running in ' + this.config.get('ENV') + ' mode!';
  }
}
