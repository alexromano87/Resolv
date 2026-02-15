import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateQuestionnaireStatoDto {
  @IsEnum(['bozza', 'in_compilazione', 'completato', 'revisionato'])
  stato: 'bozza' | 'in_compilazione' | 'completato' | 'revisionato';

  @IsOptional()
  @IsString()
  note?: string;
}
