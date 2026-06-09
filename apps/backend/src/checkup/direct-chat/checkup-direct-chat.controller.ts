import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupDirectChatService } from './checkup-direct-chat.service';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CreateDirectChatConversationDto } from './dto-create-direct-conversation.dto';
import { SendDirectChatMessageDto } from './dto-send-direct-message.dto';

@Controller('checkup/direct-chat')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupDirectChatController {
  constructor(private readonly directChatService: CheckupDirectChatService) {}

  @Get('conversations')
  listConversations(
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Query('search') search?: string,
    @Query('archived') archived?: string,
  ) {
    return this.directChatService.listConversations(user, search, archived === 'true');
  }

  @Get('recipients')
  listRecipients(@CheckupCurrentUser() user: CheckupCurrentUserData, @Query('search') search?: string) {
    return this.directChatService.listRecipients(user, search);
  }

  @Post('conversations')
  createConversation(@Body() dto: CreateDirectChatConversationDto, @CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.directChatService.createConversation(dto, user);
  }

  @Get('conversations/:id/messages')
  getMessages(@Param('id') id: string, @CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.directChatService.getMessages(id, user);
  }

  @Post('conversations/:id/messages')
  sendMessage(@Param('id') id: string, @Body() dto: SendDirectChatMessageDto, @CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.directChatService.sendMessage(id, dto, user);
  }

  @Post('messages/:id/read')
  markAsRead(@Param('id') id: string, @CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.directChatService.markAsRead(id, user);
  }

  @Patch('messages/:id')
  updateMessage(
    @Param('id') id: string,
    @Body('messaggio') messaggio: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.directChatService.updateMessage(id, messaggio, user);
  }

  @Delete('messages/:id')
  deleteMessage(@Param('id') id: string, @CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.directChatService.deleteMessage(id, user);
  }

  @Post('conversations/:id/archive')
  archiveConversation(@Param('id') id: string, @CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.directChatService.archiveConversation(id, user);
  }

  @Post('conversations/:id/restore')
  restoreConversation(@Param('id') id: string, @CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.directChatService.restoreConversation(id, user);
  }

  @Delete('conversations/:id')
  deleteConversation(@Param('id') id: string, @CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.directChatService.deleteConversation(id, user);
  }

  @Get('unread-count')
  getUnreadCount(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.directChatService.getUnreadCount(user);
  }

  @Post('presence')
  markOnline(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.directChatService.markOnline(user);
  }
}
