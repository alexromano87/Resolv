import { IsString, MinLength } from 'class-validator';

export class SendDirectChatMessageDto {
  @IsString()
  @MinLength(1)
  messaggio: string;
}
