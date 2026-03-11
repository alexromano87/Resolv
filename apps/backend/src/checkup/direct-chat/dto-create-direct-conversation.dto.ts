import { IsUUID } from 'class-validator';

export class CreateDirectChatConversationDto {
  @IsUUID()
  participantUserId: string;
}
