import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePreassessmentAlertDto {
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsIn(['info', 'warning', 'urgent'])
  priority?: 'info' | 'warning' | 'urgent';

  @IsString()
  @MinLength(2)
  messaggio: string;
}
