import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdatePreassessmentDto {
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;

  @IsOptional()
  @IsObject()
  notes?: Record<string, string>;

  @IsOptional()
  @IsObject()
  fieldNotes?: Record<string, string>;

  @IsOptional()
  @IsObject()
  naFields?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  macroValidations?: Record<string, { by: { id: string; name: string; ruolo: string }; at: string }>;

  @IsOptional()
  @IsBoolean()
  studioCanEdit?: boolean;
}
