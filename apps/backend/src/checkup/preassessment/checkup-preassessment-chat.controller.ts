import { Controller, Delete, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupPreassessmentChatService } from './checkup-preassessment-chat.service';
import { SendPreassessmentMessageDto } from './dto/send-preassessment-message.dto';

@Controller('checkup/preassessment')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupPreassessmentChatController {
  constructor(private readonly chatService: CheckupPreassessmentChatService) {}

  @Get(':preassessmentId/sections/:sectionId/chat')
  getMessages(
    @Param('preassessmentId') preassessmentId: string,
    @Param('sectionId') sectionId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.chatService.getMessages(preassessmentId, sectionId, user);
  }

  @Get(':preassessmentId/sections/:sectionId/typing')
  getTyping(
    @Param('preassessmentId') preassessmentId: string,
    @Param('sectionId') sectionId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.chatService.getTyping(preassessmentId, sectionId, user);
  }

  @Post(':preassessmentId/sections/:sectionId/chat')
  sendMessage(
    @Param('preassessmentId') preassessmentId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: SendPreassessmentMessageDto,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.chatService.sendMessage(preassessmentId, sectionId, dto, user);
  }

  @Post(':preassessmentId/sections/:sectionId/typing')
  setTyping(
    @Param('preassessmentId') preassessmentId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: { active: boolean },
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.chatService.setTyping(preassessmentId, sectionId, dto.active, user);
  }

  @Patch('chat/:id/read')
  markAsRead(
    @Param('id') id: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.chatService.markAsRead(id, user);
  }

  @Patch('chat/:id')
  updateMessage(
    @Param('id') id: string,
    @Body('messaggio') messaggio: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.chatService.updateMessage(id, messaggio, user);
  }

  @Delete('chat/:id')
  deleteMessage(
    @Param('id') id: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.chatService.deleteMessage(id, user);
  }
}
