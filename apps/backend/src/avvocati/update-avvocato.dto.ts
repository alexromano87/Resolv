// apps/backend/src/avvocati/update-avvocato.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateAvvocatoDto } from './create-avvocato.dto';

export class UpdateAvvocatoDto extends PartialType(CreateAvvocatoDto) {}
