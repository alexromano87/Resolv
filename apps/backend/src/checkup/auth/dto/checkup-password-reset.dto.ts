import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CheckupPasswordResetRequestDto {
  @IsEmail()
  email: string;
}

export class CheckupPasswordResetConfirmDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  // [M-03] Min 12 (policy interna). Max 72: limite bcrypt.
  @MinLength(12)
  @MaxLength(72)
  newPassword: string;
}
