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
  @IsBoolean()
  studioCanEdit?: boolean;
}
