import { IsBoolean, IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

class NotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  popup?: boolean;

  @IsOptional()
  @IsBoolean()
  sound?: boolean;

  @IsOptional()
  @IsBoolean()
  email?: boolean;
}

class PrivacySettingsDto {
  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  shareUsage?: boolean;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsIn(['it', 'en'])
  language?: 'it' | 'en';

  @IsOptional()
  @IsIn(['confortevole', 'compatta'])
  density?: 'confortevole' | 'compatta';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notifications?: NotificationSettingsDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PrivacySettingsDto)
  privacy?: PrivacySettingsDto;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  telefono?: string;
}
