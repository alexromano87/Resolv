// apps/backend/src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity';
import { Cliente } from '../clienti/cliente.entity';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  ruolo: string;
  tokenVersion: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start without it.');
        }
        return secret;
      })(),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, attivo: true },
      relations: ['studi'],
    });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Utente non trovato o disattivato');
    }

    let resolvedClienteId = user.clienteId;
    if (user.ruolo === 'cliente' && !resolvedClienteId) {
      const email = user.email.toLowerCase().trim();
      const query = this.clienteRepository
        .createQueryBuilder('cliente')
        .where('LOWER(cliente.referenteEmail) = :email', { email })
        .orWhere('LOWER(cliente.email) = :email', { email });
      if (user.currentStudioId) {
        query.andWhere('cliente.studioId = :studioId', { studioId: user.currentStudioId });
      }
      const cliente = await query.getOne();
      resolvedClienteId = cliente?.id ?? null;
    }

    return {
      id: user.id,
      email: user.email,
      nome: user.nome,
      cognome: user.cognome,
      ruolo: user.ruolo,
      isAdmin: user.isAdmin,
      clienteId: resolvedClienteId,
      studioId: user.studioId,
      currentStudioId: user.currentStudioId,
      studi: user.studi,
    };
  }
}
