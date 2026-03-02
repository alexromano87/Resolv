import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdatePreassessmentAlertDto {
  @IsOptional()
  @IsIn(['info', 'warning', 'urgent'])
  priority?: 'info' | 'warning' | 'urgent';

  @IsOptional()
  @IsString()
  @MinLength(2)
  messaggio?: string;

  /** ISO date string or null to remove expiry */
  @IsOptional()
  @IsDateString()
  dataScadenza?: string | null;

  /** Days before expiry to show a warning, or null to remove */
  @IsOptional()
  @IsInt()
  @Min(1)
  preavvisoGiorni?: number | null;
}
