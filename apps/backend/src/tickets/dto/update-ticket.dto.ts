// apps/backend/src/tickets/dto/update-ticket.dto.ts
import { IsString, IsEnum, IsOptional } from 'class-validator';
import type { TicketStato, TicketPriorita } from '../ticket.entity';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class UpdateTicketDto {
  @IsString()
  @IsOptional()
  @NoSpecialChars()
  oggetto?: string;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  descrizione?: string;

  @IsEnum(['bassa', 'normale', 'alta', 'urgente'])
  @IsOptional()
  priorita?: TicketPriorita;

  @IsEnum(['aperto', 'in_gestione', 'chiuso'])
  @IsOptional()
  stato?: TicketStato;
}
