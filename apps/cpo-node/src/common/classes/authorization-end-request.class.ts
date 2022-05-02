import { ApiProperty } from '@nestjs/swagger';
import { AuthorizationSession } from './authorization-session.class';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class Token {
  @ApiProperty({})
  @IsNotEmpty()
  uid: string;
}

export class AuthorizationEndRequest {
  @ApiProperty({})
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Token)
  token: Token;

  @IsNotEmpty()
  @ApiProperty({})
  @ValidateNested()
  @Type(() => AuthorizationSession)
  session: AuthorizationSession;

  @IsNotEmpty()
  @ApiProperty({})
  contractDID: string;
}
