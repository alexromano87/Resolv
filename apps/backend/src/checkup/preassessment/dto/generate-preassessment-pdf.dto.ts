import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class GeneratePreassessmentPdfDto {
  @IsUUID()
  preassessmentId: string;

  @IsOptional()
  @IsBoolean()
  excludeNA?: boolean;

  @IsOptional()
  @IsBoolean()
  includeConsultantNotes?: boolean;
}
