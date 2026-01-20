import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserData,
    @Query('unread') unread?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.listForUser(user.id, {
      unread: unread === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post(':id/read')
  async markRead(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: CurrentUserData) {
    return this.notificationsService.markAllRead(user.id);
  }
}
