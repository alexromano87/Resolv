import { IsIn, IsUUID } from 'class-validator';

/** Aggiunge un'appartenenza staff a un'identità esistente in un licenziatario. */
export class AddUserMembershipDto {
  @IsUUID()
  studioId: string;

  @IsIn(['admin_studio', 'segreteria', 'collaboratore'])
  ruolo: 'admin_studio' | 'segreteria' | 'collaboratore';
}
