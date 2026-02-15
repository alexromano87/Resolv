import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsInt, Min, MaxLength } from 'class-validator';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';
import type { BillingCycle, LicensePlan } from '../license-request.entity';

export class CreateLicenseRequestDto {
  @IsEnum(['starter', 'professional', 'enterprise'])
  plan: LicensePlan;

  @IsEnum(['monthly', 'annual'])
  billingCycle: BillingCycle;

  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  studioNome: string;

  @IsEnum(['individuale', 'associato', 'societa_tra_professionisti'])
  studioTipologia: 'individuale' | 'associato' | 'societa_tra_professionisti';

  @IsInt()
  @Min(1)
  @IsOptional()
  studioMaxUtenti?: number | null;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  studioRagioneSociale?: string | null;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  studioPartitaIva?: string | null;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  studioCodiceFiscale?: string | null;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  studioIndirizzo?: string | null;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  studioCitta?: string | null;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  studioCap?: string | null;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  studioProvincia?: string | null;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  studioTelefono?: string | null;

  @IsEmail()
  @IsOptional()
  studioEmail?: string | null;

  @IsEmail()
  @IsOptional()
  studioPec?: string | null;

  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  adminNome: string;

  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  adminCognome: string;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  adminTelefono?: string | null;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  adminCodiceFiscale?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string | null;
}
