// apps/backend/src/alerts/dto/create-alert.dto.ts
import { IsString, IsUUID, IsEnum, IsDateString, IsInt, Min, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import type { AlertDestinatario, AlertModalitaNotifica } from '../alert.entity';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';
import { IsFutureOrTodayDate } from '../../common/validators/is-future-date.decorator';

export class CreateAlertDto {
  @IsOptional()
  @IsUUID()
  studioId?: string | null;

  @IsUUID()
  @IsNotEmpty()
  praticaId: string;

  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  titolo: string;

  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  descrizione: string;

  @IsEnum(['studio', 'cliente'])
  destinatario: AlertDestinatario;

  @IsEnum(['popup'])
  @IsOptional()
  modalitaNotifica?: AlertModalitaNotifica;

  @IsDateString()
  @IsFutureOrTodayDate()
  dataScadenza: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  giorniAnticipo?: number;

  @IsBoolean()
  @IsOptional()
  clienteCanClose?: boolean;
}
