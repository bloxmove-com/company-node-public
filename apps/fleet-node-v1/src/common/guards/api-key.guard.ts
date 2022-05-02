import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@bloxmove-com/did-asset-library-core-obfuscated';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.header('Access-Control-Allow-Origin', '*');
    request.header('Access-Control-Allow-Headers', 'apiKey, content-type');
    const apiKey = request.get('apiKey');
    const requiredApiKey = this.config.get('apiKey');
    if (!apiKey || apiKey !== requiredApiKey) {
      Logger.error('unauthorised to perform this request!', '', 'ApiKeyGuard', false);
      throw new UnauthorizedException();
    }
    return true;
  }
}
