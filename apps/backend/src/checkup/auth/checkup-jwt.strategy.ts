import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupMembershipsService } from '../memberships/checkup-memberships.service';

export interface CheckupJwtPayload {
  sub: string;
  email: string;
  ruolo: string;
  /** Id dell'appartenenza attiva (contesto scelto). Opzionale per retro-compatibilità. */
  mid?: string;
}

@Injectable()
export class CheckupJwtStrategy extends PassportStrategy(Strategy, 'checkup-jwt') {
  constructor(
    private configService: ConfigService,
    @InjectRepository(CheckupUser)
    private checkupUserRepo: Repository<CheckupUser>,
    private membershipsService: CheckupMembershipsService,
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

    // Sovrappone il contesto dell'appartenenza attiva (scelta via token `mid`,
    // con fallback alla primaria). Gli utenti senza appartenenze mantengono le
    // colonne legacy invariate.
    const membership = await this.membershipsService.resolveActive(user.id, payload.mid);
    this.membershipsService.applyToUser(user, membership);

    return user;
  }
}
