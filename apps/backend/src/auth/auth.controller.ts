// apps/backend/src/auth/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, type CurrentUserData } from './current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { TwoFactorLoginVerifyDto, TwoFactorRequestDto, TwoFactorVerifyDto } from './dto/two-factor.dto';
import { PasswordResetRequestDto, PasswordResetConfirmDto } from './dto/password-reset.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RateLimit } from '../common/rate-limit.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @RateLimit({ limit: 3, windowMs: 60 * 60 * 1000 })  // 3 per hour
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @RateLimit({ limit: 5, windowMs: 60 * 1000 })  // 5 per minute (brute-force protection)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('password-reset/request')
  @RateLimit({ limit: 3, windowMs: 15 * 60 * 1000 })  // 3 per 15 minutes
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('password-reset/confirm')
  @RateLimit({ limit: 5, windowMs: 15 * 60 * 1000 })  // 5 per 15 minutes
  async confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset(dto.email, dto.token, dto.newPassword);
  }

  @Post('login/2fa')
  @RateLimit({ limit: 5, windowMs: 60 * 1000 })  // 5 per minute
  async verifyTwoFactorLogin(@Body() dto: TwoFactorLoginVerifyDto) {
    return this.authService.verifyTwoFactorLogin(dto.userId, dto.code);
  }

  @Post('refresh')
  @RateLimit({ limit: 15, windowMs: 60 * 1000 })  // 15 per minute
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.userId, dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return this.authService.getProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@CurrentUser() user: CurrentUserData) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: CurrentUserData) {
    return this.authService.logoutAll(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('settings')
  async getSettings(@CurrentUser() user: CurrentUserData) {
    return this.authService.getSettings(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('settings')
  async updateSettings(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.authService.updateSettings(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable/request')
  async requestEnableTwoFactor(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: TwoFactorRequestDto,
  ) {
    return this.authService.requestTwoFactorEnable(user.id, dto.channel, dto.telefono);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable/verify')
  async verifyEnableTwoFactor(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: TwoFactorVerifyDto,
  ) {
    return this.authService.verifyTwoFactorEnable(user.id, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable/request')
  async requestDisableTwoFactor(@CurrentUser() user: CurrentUserData) {
    return this.authService.requestTwoFactorDisable(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable/verify')
  async verifyDisableTwoFactor(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: TwoFactorVerifyDto,
  ) {
    return this.authService.verifyTwoFactorDisable(user.id, dto.code);
  }

  @Post('select-studio')
  @RateLimit({ limit: 10, windowMs: 60 * 1000 })  // 10 per minute
  async selectStudio(@Body() body: { userId: string; studioId: string }) {
    return this.authService.selectStudio(body.userId, body.studioId);
  }
}
