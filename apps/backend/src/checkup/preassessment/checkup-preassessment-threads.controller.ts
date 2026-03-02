import { Controller, Get, Post, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupPreassessmentThreadsService } from './checkup-preassessment-threads.service';
import { CreatePreassessmentTicketDto } from './dto/create-preassessment-ticket.dto';
import { ReplyPreassessmentTicketDto } from './dto/reply-preassessment-ticket.dto';
import { CreatePreassessmentAlertDto } from './dto/create-preassessment-alert.dto';

@Controller('checkup/preassessment')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupPreassessmentThreadsController {
  constructor(private readonly threadsService: CheckupPreassessmentThreadsService) {}

  @Get(':preassessmentId/tickets')
  listTickets(
    @Param('preassessmentId') preassessmentId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.threadsService.listTickets(preassessmentId, user);
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
    @Body('type') type: 'tickets' | 'alerts',
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    if (type === 'tickets' || type === 'alerts') {
      await this.threadsService.markSeen(user.id, preassessmentId, type);
    }
  }
}
