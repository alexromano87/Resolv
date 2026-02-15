import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateQuestionnaireDto {
  @IsUUID()
  @IsNotEmpty()
  templateId: string;

  @IsUUID()
  @IsNotEmpty()
  clienteUserId: string;

  @IsOptional()
  @IsString()
  note?: string;
}
