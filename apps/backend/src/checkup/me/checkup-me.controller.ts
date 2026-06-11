import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupMeService } from './checkup-me.service';
import { RateLimit } from '../../common/rate-limit.decorator';

@Controller('checkup/me')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupMeController {
  constructor(private readonly meService: CheckupMeService) {}

  /** Export all personal data as downloadable JSON (GDPR art. 20 — portabilità). */
  @Get('export')
  @RateLimit({ limit: 5, windowMs: 60 * 60 * 1000 }) // 5/hour
  async exportMyData(
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Res() res: Response,
  ) {
    const data = await this.meService.exportMyData(user.id);
    const filename = `my-data-${new Date().toISOString().split('T')[0]}.json`;
    res.set({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(JSON.stringify(data, null, 2));
  }

  /** Submit a deletion request (GDPR art. 17 — diritto all'oblio). */
  @Post('deletion-request')
  @RateLimit({ limit: 3, windowMs: 24 * 60 * 60 * 1000 }) // 3/day
  async requestDeletion(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    await this.meService.requestDeletion(
      user.id,
      user.email,
      `${user.nome} ${user.cognome}`,
    );
    return { ok: true, message: 'Richiesta inviata. Sarai contattato entro 30 giorni.' };
  }

  @Get('system-notifications')
  async getSystemNotifications(
    @CheckupCurrentUser() currentUser: CheckupCurrentUserData,
    @Query('query') query?: string,
    @Query('type') type?: 'sezione_validata' | 'checkup_completato' | 'validazione_finale' | 'nuova_versione' | 'nota_cliente',
    @Query('read') read?: 'read' | 'unread',
    @Query('notificationId') notificationId?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.meService.getSystemNotifications({
      studioId: currentUser.studioId ?? null,
      userId: currentUser.id,
      ruolo: currentUser.ruolo,
      query,
      type,
      read,
      notificationId,
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
    });
  }

  @Get('notifications')
  getNotifications(
    @CheckupCurrentUser() currentUser: CheckupCurrentUserData,
    @Query('query') query?: string,
    @Query('type') type?: 'consultant_note' | 'client_note' | 'ticket_created' | 'ticket_updated' | 'chat_message' | 'direct_chat_message' | 'preassessment_section_validated' | 'preassessment_final_validated' | 'preassessment_reopened' | 'preassessment_new_version',
    @Query('read') read?: 'read' | 'unread',
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.meService.getNotifications(currentUser.id, {
      query,
      type,
      read,
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
    });
  }

  @Get('notifications/count')
  getNotificationsCount(@CheckupCurrentUser() currentUser: CheckupCurrentUserData) {
    return this.meService.getNotificationsCount(currentUser.id);
  }

  @Post('system-notifications/:id/read')
  markSystemNotificationRead(
    @CheckupCurrentUser() currentUser: CheckupCurrentUserData,
    @Param('id') id: string,
  ) {
    return this.meService.markSystemNotificationRead(currentUser, id);
  }

  @Post('system-notifications/read')
  markSystemNotificationsRead(
    @CheckupCurrentUser() currentUser: CheckupCurrentUserData,
    @Body('ids') ids?: string[],
    @Body('all') all?: boolean,
  ) {
    if (all) return this.meService.markAllSystemNotificationsRead(currentUser);
    return this.meService.markSystemNotificationsRead(currentUser, Array.isArray(ids) ? ids : []);
  }

  @Delete('system-notifications/:id')
  deleteSystemNotification(
    @CheckupCurrentUser() currentUser: CheckupCurrentUserData,
    @Param('id') id: string,
  ) {
    return this.meService.deleteSystemNotification(currentUser, id);
  }

  @Post('system-notifications/delete')
  deleteSystemNotifications(
    @CheckupCurrentUser() currentUser: CheckupCurrentUserData,
    @Body('ids') ids: string[],
  ) {
    return this.meService.deleteSystemNotifications(currentUser, Array.isArray(ids) ? ids : []);
  }

  @Post('notifications/:id/read')
  markNotificationRead(
    @CheckupCurrentUser() currentUser: CheckupCurrentUserData,
    @Param('id') id: string,
  ) {
    return this.meService.markNotificationRead(currentUser.id, id);
  }

  @Post('notifications/read')
  markNotificationsRead(
    @CheckupCurrentUser() currentUser: CheckupCurrentUserData,
    @Body('ids') ids?: string[],
    @Body('all') all?: boolean,
  ) {
    if (all) return this.meService.markAllNotificationsRead(currentUser.id);
    return this.meService.markNotificationsRead(currentUser.id, Array.isArray(ids) ? ids : []);
  }

  @Delete('notifications/:id')
  deleteNotification(
    @CheckupCurrentUser() currentUser: CheckupCurrentUserData,
    @Param('id') id: string,
  ) {
    return this.meService.deleteNotification(currentUser.id, id);
  }

  @Post('notifications/delete')
  deleteNotifications(
    @CheckupCurrentUser() currentUser: CheckupCurrentUserData,
    @Body('ids') ids: string[],
  ) {
    return this.meService.deleteNotifications(currentUser.id, Array.isArray(ids) ? ids : []);
  }
}
