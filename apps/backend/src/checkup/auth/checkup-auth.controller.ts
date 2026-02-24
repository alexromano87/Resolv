import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
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

@Controller('checkup/auth')
export class CheckupAuthController {
  constructor(private readonly authService: CheckupAuthService) {}

  @Post('login')
  login(@Body() dto: CheckupLoginDto) {
    return this.authService.login(dto);
  }

  @Post('login/2fa')
  verifyTwoFactorLogin(@Body() dto: CheckupTwoFactorLoginVerifyDto) {
    return this.authService.verifyTwoFactorLogin(dto.userId, dto.code);
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
  changePassword(
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Body() dto: CheckupChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
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
}
