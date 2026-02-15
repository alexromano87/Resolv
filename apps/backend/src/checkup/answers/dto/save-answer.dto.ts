import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SingleAnswerDto {
  @IsUUID()
  questionId: string;

  @IsOptional()
  @IsString()
  valore?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  richiesto?: boolean;

  @IsOptional()
  @IsBoolean()
  evaso?: boolean;
}

export class BulkSaveAnswersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleAnswerDto)
  answers: SingleAnswerDto[];
}
