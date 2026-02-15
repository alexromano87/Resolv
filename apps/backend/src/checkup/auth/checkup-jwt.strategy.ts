import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CheckupUser } from '../users/checkup-user.entity';

export interface CheckupJwtPayload {
  sub: string;
  email: string;
  ruolo: string;
}

@Injectable()
export class CheckupJwtStrategy extends PassportStrategy(Strategy, 'checkup-jwt') {
  constructor(
    @InjectRepository(CheckupUser)
    private checkupUserRepository: Repository<CheckupUser>,
    private configService: ConfigService,
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

  async validate(payload: CheckupJwtPayload) {
    const user = await this.checkupUserRepository.findOne({
      where: { id: payload.sub, attivo: true },
    });

    if (!user) {
      throw new UnauthorizedException('Utente non trovato o disattivato');
    }

    return {
      id: user.id,
      email: user.email,
      nome: user.nome,
      cognome: user.cognome,
      ruolo: user.ruolo,
      studioId: user.studioId,
      azienda: user.azienda,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
