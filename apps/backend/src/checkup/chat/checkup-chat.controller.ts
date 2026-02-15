import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { CheckupChatService } from './checkup-chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

@Controller('checkup')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupChatController {
  constructor(private readonly chatService: CheckupChatService) {}

  @Post('questionnaires/:questionnaireId/sections/:sectionId/chat')
  sendMessage(
    @Param('questionnaireId') questionnaireId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: SendMessageDto,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.chatService.sendMessage(questionnaireId, sectionId, dto, user);
  }

  @Get('questionnaires/:questionnaireId/sections/:sectionId/chat')
  getMessages(
    @Param('questionnaireId') questionnaireId: string,
    @Param('sectionId') sectionId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.chatService.getMessages(questionnaireId, sectionId, user);
  }

  @Patch('chat/:id/read')
  markAsRead(
    @Param('id') id: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.chatService.markAsRead(id, user);
  }

  @Get('questionnaires/:questionnaireId/chat/unread-count')
  getUnreadCounts(
    @Param('questionnaireId') questionnaireId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.chatService.getUnreadCounts(questionnaireId, user);
  }
}
