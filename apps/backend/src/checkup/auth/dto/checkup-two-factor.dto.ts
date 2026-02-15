import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CheckupTwoFactorRequestDto {
  @IsIn(['sms', 'email'])
  channel: 'sms' | 'email';

  @IsOptional()
  @IsString()
  telefono?: string;
}

export class CheckupTwoFactorVerifyDto {
  @IsString()
  @MinLength(4)
  code: string;
}

export class CheckupTwoFactorLoginVerifyDto {
  @IsString()
  userId: string;

  @IsString()
  @MinLength(4)
  code: string;
}
