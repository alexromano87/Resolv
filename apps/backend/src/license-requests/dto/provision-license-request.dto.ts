import { IsOptional, MinLength } from 'class-validator';

export class ProvisionLicenseRequestDto {
  @IsOptional()
  @MinLength(6)
  adminPassword?: string;
}
