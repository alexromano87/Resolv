// apps/backend/src/alerts/dto/update-alert.dto.ts
import { IsString, IsEnum, IsDateString, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';
import type { AlertStato, AlertDestinatario, AlertModalitaNotifica } from '../alert.entity';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class UpdateAlertDto {
  @IsString()
  @IsOptional()
  @NoSpecialChars()
  titolo?: string;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  descrizione?: string;

  @IsEnum(['studio', 'cliente'])
  @IsOptional()
  destinatario?: AlertDestinatario;

  @IsEnum(['popup'])
  @IsOptional()
  modalitaNotifica?: AlertModalitaNotifica;

  @IsDateString()
  @IsOptional()
  dataScadenza?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  giorniAnticipo?: number;

  @IsEnum(['in_gestione', 'chiuso'])
  @IsOptional()
  stato?: AlertStato;

  @IsBoolean()
  @IsOptional()
  clienteCanClose?: boolean;
}
