// src/debitori/dto/update-debitore.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateDebitoreDto } from './create-debitore.dto';

export class UpdateDebitoreDto extends PartialType(CreateDebitoreDto) {}
