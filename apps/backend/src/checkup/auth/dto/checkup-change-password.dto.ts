import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CheckupChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  // [M-03] Min 12 (policy interna più restrittiva). Max 72: limite bcrypt.
  @MinLength(12)
  @MaxLength(72)
  newPassword: string;
}
