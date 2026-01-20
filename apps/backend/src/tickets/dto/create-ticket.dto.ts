// apps/backend/src/tickets/dto/create-ticket.dto.ts
import { IsString, IsUUID, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import type { TicketPriorita, TicketCategoria } from '../ticket.entity';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class CreateTicketDto {
  @IsOptional()
  @IsUUID()
  studioId?: string | null;

  @IsUUID()
  @IsOptional()
  praticaId?: string | null;

  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  oggetto: string;

  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  descrizione: string;

  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  autore: string;

  @IsEnum(['richiesta_informazioni', 'documentazione', 'pagamenti', 'segnalazione_problema', 'altro'])
  @IsOptional()
  categoria?: TicketCategoria;

  @IsEnum(['bassa', 'normale', 'alta', 'urgente'])
  @IsOptional()
  priorita?: TicketPriorita;
}
