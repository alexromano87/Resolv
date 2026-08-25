import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CheckupSwitchContextDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  membershipId: string;
}
