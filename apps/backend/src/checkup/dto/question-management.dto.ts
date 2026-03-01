import { IsString, IsOptional, IsInt, IsBoolean, IsArray, IsNumber, MaxLength, Min, IsUUID } from 'class-validator';

// Model DTOs
export class CreateQuestionModelDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(150)
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  importFromModelId?: string;
}

export class UpdateQuestionModelDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  attivo?: boolean;
}

// Macro Area DTOs
export class CreateMacroAreaDto {
  @IsUUID()
  modelId: string;

  @IsString()
  @MaxLength(10)
  code: string;

  @IsString()
  @MaxLength(100)
  label: string;

  @IsString()
  @MaxLength(7)
  color: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateMacroAreaDto {
  @IsOptional()
  @IsUUID()
  modelId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

// Section DTOs
export class CreateSectionDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  macroAreaId: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  macroAreaId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

// Field DTOs
export class CreateFieldDto {
  @IsString()
  @MaxLength(100)
  fieldId: string;

  @IsString()
  @MaxLength(300)
  label: string;

  @IsString()
  @MaxLength(50)
  type: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  help?: string;

  @IsOptional()
  @IsBoolean()
  allowDocuments?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsInt()
  sectionId: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateFieldDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fieldId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  help?: string;

  @IsOptional()
  @IsBoolean()
  allowDocuments?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsInt()
  sectionId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
