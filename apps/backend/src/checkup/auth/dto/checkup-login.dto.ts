import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CheckupLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  // [M-03] Min 8 caratteri (NIST SP 800-63B / OWASP).
  // Max 72: bcrypt tronca a 72 byte — due password che differiscono oltre il
  // byte 72 produrrebbero lo stesso hash (hash collision silenzioso).
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
