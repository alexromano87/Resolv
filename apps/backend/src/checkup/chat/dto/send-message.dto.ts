import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  messaggio: string;

  @IsOptional()
  @IsUUID()
  questionId?: string;
}
