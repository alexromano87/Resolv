import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckupUser } from '../users/checkup-user.entity';

export interface CheckupJwtPayload {
  sub: string;
  email: string;
  ruolo: string;
}

@Injectable()
export class CheckupJwtStrategy extends PassportStrategy(Strategy, 'checkup-jwt') {
  constructor(
    private configService: ConfigService,
    @InjectRepository(CheckupUser)
    private checkupUserRepo: Repository<CheckupUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const secret = configService.get<string>('CHECKUP_JWT_SECRET');
        if (!secret) {
          throw new Error('FATAL: CHECKUP_JWT_SECRET environment variable is not set. Server cannot start without it.');
        }
        return secret;
      })(),
    });
  }

  async validate(payload: CheckupJwtPayload): Promise<CheckupUser> {
    const user = await this.checkupUserRepo.findOne({
      where: { id: payload.sub },
      relations: ['studio', 'client'],
    });

    if (!user || !user.attivo) {
      throw new UnauthorizedException('Utente non trovato o non attivo');
    }

    return user;
  }
}
