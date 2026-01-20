// apps/backend/src/tickets/dto/add-messaggio.dto.ts
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class AddMessaggioDto {
  @IsEnum(['studio', 'cliente'])
  autore: 'studio' | 'cliente';

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  autoreNome?: string;

  @IsString()
  @NoSpecialChars()
  testo: string;
}
