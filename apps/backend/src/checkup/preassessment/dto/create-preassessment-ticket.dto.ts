import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreatePreassessmentTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  subject: string;

  @IsString()
  @MinLength(3)
  body: string;
}
