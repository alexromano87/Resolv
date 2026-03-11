import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, Query } from '@nestjs/common';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupPreassessmentThreadsService } from './checkup-preassessment-threads.service';
import { CreatePreassessmentTicketDto } from './dto/create-preassessment-ticket.dto';
import { ReplyPreassessmentTicketDto } from './dto/reply-preassessment-ticket.dto';
import { CreatePreassessmentAlertDto } from './dto/create-preassessment-alert.dto';
import { UpdatePreassessmentAlertDto } from './dto/update-preassessment-alert.dto';

@Controller('checkup/preassessment')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupPreassessmentThreadsController {
  constructor(private readonly threadsService: CheckupPreassessmentThreadsService) {}

  @Get('tickets')
  listAllTickets(
    @Query('search') search: string | undefined,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.listAllTickets(user, search);
  }

  @Get(':preassessmentId/tickets')
  listTickets(
    @Param('preassessmentId') preassessmentId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.listTickets(preassessmentId, user);
  }

  @Get('alerts')
  listAllAlerts(
    @Query('search') search: string | undefined,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.listAllAlerts(user, search);
  }

  @Post(':preassessmentId/tickets')
  createTicket(
    @Param('preassessmentId') preassessmentId: string,
    @Body() dto: CreatePreassessmentTicketDto,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.createTicket(preassessmentId, dto, user);
  }

  @Post('tickets/:ticketId/replies')
  replyTicket(
    @Param('ticketId') ticketId: string,
    @Body() dto: ReplyPreassessmentTicketDto,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.replyTicket(ticketId, dto, user);
  }

  @Post('tickets/:ticketId/assign')
  assignTicket(
    @Param('ticketId') ticketId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.assignTicket(ticketId, user);
  }

  @Post('tickets/:ticketId/request-close')
  requestClose(
    @Param('ticketId') ticketId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.requestClose(ticketId, user);
  }

  @Post('tickets/:ticketId/confirm-close')
  confirmClose(
    @Param('ticketId') ticketId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.confirmClose(ticketId, user);
  }

  @Post('tickets/:ticketId/reopen')
  reopenTicket(
    @Param('ticketId') ticketId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.reopenTicket(ticketId, user);
  }

  @Get(':preassessmentId/co-participants')
  getCoParticipants(
    @Param('preassessmentId') preassessmentId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.getCoParticipants(preassessmentId, user);
  }

  @Get(':preassessmentId/alerts')
  listAlerts(
    @Param('preassessmentId') preassessmentId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.listAlerts(preassessmentId, user);
  }

  @Post(':preassessmentId/alerts')
  createAlert(
    @Param('preassessmentId') preassessmentId: string,
    @Body() dto: CreatePreassessmentAlertDto,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.createAlert(preassessmentId, dto, user);
  }

  @Patch('alerts/:alertId')
  updateAlert(
    @Param('alertId') alertId: string,
    @Body() dto: UpdatePreassessmentAlertDto,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.updateAlert(alertId, dto, user);
  }

  @Post('alerts/:alertId/close')
  @HttpCode(200)
  closeAlert(
    @Param('alertId') alertId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.closeAlert(alertId, user);
  }

  @Delete('alerts/:alertId')
  @HttpCode(204)
  async deleteAlert(
    @Param('alertId') alertId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    await this.threadsService.deleteAlert(alertId, user);
  }

  @Get('alerts/expiring')
  getExpiringAlerts(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.threadsService.getExpiringAlerts(user);
  }

  @Post('alerts/:alertId/archive')
  @HttpCode(200)
  archiveAlert(
    @Param('alertId') alertId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.archiveAlert(alertId, user);
  }

  @Post('tickets/:ticketId/archive')
  @HttpCode(200)
  archiveTicket(
    @Param('ticketId') ticketId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.archiveTicket(ticketId, user);
  }

  @Post('alerts/:alertId/mute')
  muteAlert(
    @Param('alertId') alertId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.muteAlert(alertId, user);
  }

  @Post('alerts/:alertId/restore')
  restoreAlert(
    @Param('alertId') alertId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.restoreAlert(alertId, user);
  }

  @Get('chat/conversations')
  listChatConversations(
    @Query('search') search: string | undefined,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.listChatConversations(user, search);
  }

  // ─── Unread counts ───────────────────────────────────────────────────────

  @Get(':preassessmentId/unread-counts')
  getUnreadCounts(
    @Param('preassessmentId') preassessmentId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.getUnreadCounts(user.id, preassessmentId);
  }

  @Post(':preassessmentId/mark-seen')
  @HttpCode(204)
  async markSeen(
    @Param('preassessmentId') preassessmentId: string,
    @Body('type') type: 'tickets' | 'alerts' | 'chat',
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    if (type === 'tickets' || type === 'alerts' || type === 'chat') {
      await this.threadsService.markSeen(user.id, preassessmentId, type);
    }
  }
}
