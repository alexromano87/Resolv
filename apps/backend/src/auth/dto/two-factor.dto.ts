import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class TwoFactorRequestDto {
  @IsIn(['sms', 'email'])
  channel: 'sms' | 'email';

  @IsOptional()
  @IsString()
  telefono?: string;
}

export class TwoFactorVerifyDto {
  @IsString()
  @MinLength(4)
  code: string;
}

export class TwoFactorLoginVerifyDto {
  @IsString()
  userId: string;

  @IsString()
  @MinLength(4)
  code: string;
}
