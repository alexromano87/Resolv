import { Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
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
    @Query('type') type?: 'sezione_validata' | 'checkup_completato' | 'validazione_finale' | 'nuova_versione',
    @Query('notificationId') notificationId?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.meService.getSystemNotifications({
      studioId: currentUser.studioId ?? null,
      ruolo: currentUser.ruolo,
      query,
      type,
      notificationId,
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
    });
  }
}
