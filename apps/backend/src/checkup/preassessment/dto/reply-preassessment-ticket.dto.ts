import { IsString, MinLength } from 'class-validator';

export class ReplyPreassessmentTicketDto {
  @IsString()
  @MinLength(1)
  messaggio: string;
}
