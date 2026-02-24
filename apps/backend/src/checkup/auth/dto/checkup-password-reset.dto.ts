import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

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
  @MinLength(12)
  newPassword: string;
}
