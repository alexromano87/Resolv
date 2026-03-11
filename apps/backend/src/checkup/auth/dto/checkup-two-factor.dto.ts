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
  /**
   * [M-02] Token opaco emesso dal server al momento del challenge 2FA.
   * Sostituisce l'userId diretto per evitare il leak dell'UUID interno.
   * Memorizzato in Redis con TTL 5 min; eliminato dopo il primo uso.
   */
  @IsString()
  challengeToken: string;

  @IsString()
  @MinLength(4)
  code: string;
}
