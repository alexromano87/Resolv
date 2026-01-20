// apps/backend/src/utilita/dto/create-risorsa-utilita.dto.ts
import { TipoRisorsaUtilita } from '../risorsa-utilita.entity';

export class CreateRisorsaUtilitaDto {
  titolo: string;
  descrizione?: string;
  tipo: TipoRisorsaUtilita;
  studioId?: string;

  // Per file
  percorsoFile?: string;
  nomeOriginale?: string;
  estensione?: string;
  dimensione?: number;

  // Per video tutorial
  urlVideo?: string;

  // Per note di aggiornamento
  contenutoNota?: string;
  versione?: string;

  caricatoDa?: string;
}
