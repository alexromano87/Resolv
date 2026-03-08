import { Controller, Post, Get, Body, Req, Res, UseGuards, BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CheckupAuthService } from './checkup-auth.service';
import { CheckupLoginDto } from './dto/checkup-login.dto';
import { CheckupChangePasswordDto } from './dto/checkup-change-password.dto';
import {
  CheckupTwoFactorLoginVerifyDto,
  CheckupTwoFactorRequestDto,
  CheckupTwoFactorVerifyDto,
} from './dto/checkup-two-factor.dto';
import { CheckupPasswordResetRequestDto, CheckupPasswordResetConfirmDto } from './dto/checkup-password-reset.dto';
import { CheckupJwtAuthGuard } from './checkup-jwt-auth.guard';
import { CheckupCurrentUser } from './checkup-current-user.decorator';
import type { CheckupCurrentUserData } from './checkup-current-user.decorator';
import { RateLimit } from '../../common/rate-limit.decorator';

const REFRESH_COOKIE = 'checkup_rt';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('checkup/auth')
export class CheckupAuthController {
  constructor(private readonly authService: CheckupAuthService) {}

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SEVEN_DAYS_MS,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  @Post('login')
  @RateLimit({ limit: 5, windowMs: 15 * 60 * 1000 })
  async login(
    @Body() dto: CheckupLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    if ('refresh_token' in result && typeof result.refresh_token === 'string') {
      this.setRefreshCookie(res, result.refresh_token);
      const { refresh_token, ...body } = result;
      return body;
    }
    return result; // { requiresTwoFactor, userId, channel }
  }

  @Post('login/2fa')
  @RateLimit({ limit: 5, windowMs: 15 * 60 * 1000 })
  async verifyTwoFactorLogin(
    @Body() dto: CheckupTwoFactorLoginVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyTwoFactorLogin(dto.userId, dto.code);
    this.setRefreshCookie(res, result.refresh_token);
    const { refresh_token, ...body } = result;
    return body;
  }

  @Post('password-reset/request')
  @RateLimit({ limit: 3, windowMs: 15 * 60 * 1000 })
  requestPasswordReset(@Body() dto: CheckupPasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('password-reset/confirm')
  @RateLimit({ limit: 5, windowMs: 15 * 60 * 1000 })
  confirmPasswordReset(@Body() dto: CheckupPasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset(dto.email, dto.token, dto.newPassword);
  }

  @UseGuards(CheckupJwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Body() dto: CheckupChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changePassword(user.id, dto);
    this.setRefreshCookie(res, result.refresh_token);
    const { refresh_token, ...body } = result;
    return body;
  }

  @UseGuards(CheckupJwtAuthGuard)
  @Get('profile')
  getProfile(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.authService.getProfile(user.id);
  }

  @UseGuards(CheckupJwtAuthGuard)
  @Post('2fa/enable/request')
  requestEnableTwoFactor(
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Body() dto: CheckupTwoFactorRequestDto,
  ) {
    return this.authService.requestTwoFactorEnable(user.id, dto.channel, dto.telefono);
  }

  @UseGuards(CheckupJwtAuthGuard)
  @Post('2fa/enable/verify')
  verifyEnableTwoFactor(
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Body() dto: CheckupTwoFactorVerifyDto,
  ) {
    return this.authService.verifyTwoFactorEnable(user.id, dto.code);
  }

  @UseGuards(CheckupJwtAuthGuard)
  @Post('2fa/disable/request')
  requestDisableTwoFactor(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.authService.requestTwoFactorDisable(user.id);
  }

  @UseGuards(CheckupJwtAuthGuard)
  @Post('2fa/disable/verify')
  verifyDisableTwoFactor(
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Body() dto: CheckupTwoFactorVerifyDto,
  ) {
    return this.authService.verifyTwoFactorDisable(user.id, dto.code);
  }

  /** Rotate refresh token → returns new access_token (refresh_token set as httpOnly cookie) */
  @Post('refresh')
  @RateLimit({ limit: 10, windowMs: 60 * 1000 })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: string | undefined = (req.cookies as any)?.[REFRESH_COOKIE];
    if (!refreshToken) throw new BadRequestException('Token di sessione mancante');
    const result = await this.authService.refreshAccessToken(refreshToken);
    this.setRefreshCookie(res, result.refresh_token);
    return { access_token: result.access_token };
  }

  /** Server-side logout: blacklists the refresh token in Redis and clears cookie */
  @UseGuards(CheckupJwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: string = (req.cookies as any)?.[REFRESH_COOKIE] ?? '';
    await this.authService.logout(refreshToken);
    this.clearRefreshCookie(res);
    return { ok: true };
  }
}
