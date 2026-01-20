import { PartialType } from '@nestjs/mapped-types';
import { CreateTassoInteresseDto } from './create-tasso-interesse.dto';

export class UpdateTassoInteresseDto extends PartialType(CreateTassoInteresseDto) {}
