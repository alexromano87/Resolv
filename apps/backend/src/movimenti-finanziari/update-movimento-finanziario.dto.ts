// apps/backend/src/movimenti-finanziari/update-movimento-finanziario.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateMovimentoFinanziarioDto } from './create-movimento-finanziario.dto';

export class UpdateMovimentoFinanziarioDto extends PartialType(
  OmitType(CreateMovimentoFinanziarioDto, ['praticaId'] as const),
) {}
