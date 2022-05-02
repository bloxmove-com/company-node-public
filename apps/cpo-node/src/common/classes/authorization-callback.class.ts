import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

class VerificationResult {
  @ApiProperty({})
  @IsArray()
  @IsString({ each: true })
  checks: string[];

  @ApiProperty({})
  @IsArray()
  @IsString({ each: true })
  warnings: string[];

  @ApiProperty({})
  @IsArray()
  @IsString({ each: true })
  errors: string[];
}

class PresentationSubmission {
  @ApiProperty({})
  @ValidateNested()
  verificationResult: VerificationResult;

  @ApiProperty({})
  vp;
}

export class AuthorizationCallback {
  @ApiProperty({})
  transactionId: string;

  @ApiProperty({})
  @IsNotEmpty()
  exchangeId: string;

  @ApiProperty({})
  vpRequest;

  @ApiProperty({})
  @ValidateNested()
  @IsOptional()
  presentationSubmission?: PresentationSubmission;
}
