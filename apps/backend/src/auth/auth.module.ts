// apps/backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../users/user.entity';
import { Cliente } from '../clienti/cliente.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RateLimitGuard } from '../common/rate-limit.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Cliente]),
    PassportModule,
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: (() => {
          const secret = configService.get<string>('JWT_SECRET');
          if (!secret) {
            throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start without it.');
          }
          return secret;
        })(),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RateLimitGuard],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
