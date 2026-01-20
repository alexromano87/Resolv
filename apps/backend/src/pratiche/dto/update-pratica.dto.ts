// src/pratiche/dto/update-pratica.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePraticaDto } from './create-pratica.dto';

export class UpdatePraticaDto extends PartialType(CreatePraticaDto) {}