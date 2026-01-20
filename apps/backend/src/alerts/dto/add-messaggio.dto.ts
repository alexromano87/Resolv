// apps/backend/src/alerts/dto/add-messaggio.dto.ts
import { IsString, IsEnum } from 'class-validator';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class AddMessaggioDto {
  @IsEnum(['studio', 'cliente'])
  autore: 'studio' | 'cliente';

  @IsString()
  @NoSpecialChars()
  testo: string;
}
