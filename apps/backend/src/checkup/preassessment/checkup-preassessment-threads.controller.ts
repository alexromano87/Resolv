import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
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
}
