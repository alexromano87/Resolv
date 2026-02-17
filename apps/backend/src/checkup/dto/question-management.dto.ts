import { IsString, IsOptional, IsInt, IsBoolean, IsArray, MaxLength, Min } from 'class-validator';

// Macro Area DTOs
export class CreateMacroAreaDto {
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
  @IsInt()
  sectionId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
