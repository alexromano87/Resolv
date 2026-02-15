import { IsNotEmpty, IsString } from 'class-validator';

export class SendPreassessmentMessageDto {
  @IsString()
  @IsNotEmpty()
  messaggio: string;
}
