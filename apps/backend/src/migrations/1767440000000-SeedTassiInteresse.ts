import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration per popolare la tabella tasso_interesse con lo storico
 * dei tassi legali e moratori dal 2020 ad oggi
 *
 * Fonti:
 * - Tassi legali: Decreti MEF pubblicati in Gazzetta Ufficiale
 * - Tassi moratori: MEF (Tasso BCE + 8% per transazioni dopo 31/12/2012)
 */
export class SeedTassiInteresse1767440000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tassi di interesse LEGALI dal 2020 al 2026
    const tassiLegali = [
      {
        tipo: 'legale',
        tassoPercentuale: 0.05,
        dataInizioValidita: '2020-01-01',
        dataFineValidita: '2020-12-31',
        decretoRiferimento: 'Decreto MEF 12/12/2019 - GU n.293',
        note: 'Tasso legale 2020',
      },
      {
        tipo: 'legale',
        tassoPercentuale: 0.01,
        dataInizioValidita: '2021-01-01',
        dataFineValidita: '2022-12-31',
        decretoRiferimento: 'Decreto MEF 11/12/2020 - GU n.309',
        note: 'Tasso legale 2021-2022 (confermato per due anni)',
      },
      {
        tipo: 'legale',
        tassoPercentuale: 5.0,
        dataInizioValidita: '2023-01-01',
        dataFineValidita: '2023-12-31',
        decretoRiferimento: 'Decreto MEF 13/12/2022 - GU n.291',
        note: 'Tasso legale 2023 - Forte aumento dovuto all\'inflazione',
      },
      {
        tipo: 'legale',
        tassoPercentuale: 2.5,
        dataInizioValidita: '2024-01-01',
        dataFineValidita: '2024-12-31',
        decretoRiferimento: 'Decreto MEF 12/12/2023 - GU n.290',
        note: 'Tasso legale 2024 - Riduzione dal 5% al 2.5%',
      },
      {
        tipo: 'legale',
        tassoPercentuale: 2.0,
        dataInizioValidita: '2025-01-01',
        dataFineValidita: '2025-12-31',
        decretoRiferimento: 'Decreto MEF 11/12/2024 - GU n.290',
        note: 'Tasso legale 2025',
      },
      {
        tipo: 'legale',
        tassoPercentuale: 1.6,
        dataInizioValidita: '2026-01-01',
        dataFineValidita: '2026-12-31',
        decretoRiferimento: 'Decreto MEF 10/12/2025 - GU n.289',
        note: 'Tasso legale 2026',
      },
    ];

    // Tassi di interesse MORATORI dal 2020 al 2025
    // Formula: Tasso BCE + 8% (DLGS 192/2012 per transazioni dopo 31/12/2012)
    const tassiMoratori = [
      {
        tipo: 'moratorio',
        tassoPercentuale: 8.0,
        dataInizioValidita: '2020-01-01',
        dataFineValidita: '2020-06-30',
        decretoRiferimento: 'MEF - Semestre 1/2020',
        note: 'Tasso BCE 0.00% + 8% = 8.00%',
      },
      {
        tipo: 'moratorio',
        tassoPercentuale: 8.0,
        dataInizioValidita: '2020-07-01',
        dataFineValidita: '2020-12-31',
        decretoRiferimento: 'MEF - Semestre 2/2020',
        note: 'Tasso BCE 0.00% + 8% = 8.00%',
      },
      {
        tipo: 'moratorio',
        tassoPercentuale: 8.0,
        dataInizioValidita: '2021-01-01',
        dataFineValidita: '2021-06-30',
        decretoRiferimento: 'MEF - Semestre 1/2021',
        note: 'Tasso BCE 0.00% + 8% = 8.00%',
      },
      {
        tipo: 'moratorio',
        tassoPercentuale: 8.0,
        dataInizioValidita: '2021-07-01',
        dataFineValidita: '2021-12-31',
        decretoRiferimento: 'MEF - Semestre 2/2021',
        note: 'Tasso BCE 0.00% + 8% = 8.00%',
      },
      {
        tipo: 'moratorio',
        tassoPercentuale: 8.0,
        dataInizioValidita: '2022-01-01',
        dataFineValidita: '2022-06-30',
        decretoRiferimento: 'MEF - Semestre 1/2022',
        note: 'Tasso BCE 0.00% + 8% = 8.00%',
      },
      {
        tipo: 'moratorio',
        tassoPercentuale: 8.5,
        dataInizioValidita: '2022-07-01',
        dataFineValidita: '2022-12-31',
        decretoRiferimento: 'MEF - Semestre 2/2022',
        note: 'Tasso BCE 0.50% + 8% = 8.50% (inizio rialzi BCE)',
      },
      {
        tipo: 'moratorio',
        tassoPercentuale: 10.0,
        dataInizioValidita: '2023-01-01',
        dataFineValidita: '2023-06-30',
        decretoRiferimento: 'MEF - Semestre 1/2023',
        note: 'Tasso BCE 2.00% + 8% = 10.00%',
      },
      {
        tipo: 'moratorio',
        tassoPercentuale: 12.25,
        dataInizioValidita: '2023-07-01',
        dataFineValidita: '2023-12-31',
        decretoRiferimento: 'MEF - Semestre 2/2023 - GU n.161',
        note: 'Tasso BCE 4.25% + 8% = 12.25% (picco massimo)',
      },
      {
        tipo: 'moratorio',
        tassoPercentuale: 12.0,
        dataInizioValidita: '2024-01-01',
        dataFineValidita: '2024-06-30',
        decretoRiferimento: 'MEF - Semestre 1/2024 - GU n.157',
        note: 'Tasso BCE 4.00% + 8% = 12.00%',
      },
      {
        tipo: 'moratorio',
        tassoPercentuale: 11.5,
        dataInizioValidita: '2024-07-01',
        dataFineValidita: '2024-12-31',
        decretoRiferimento: 'MEF - Semestre 2/2024 - GU n.160',
        note: 'Tasso BCE 3.50% + 8% = 11.50%',
      },
      {
        tipo: 'moratorio',
        tassoPercentuale: 10.65,
        dataInizioValidita: '2025-01-01',
        dataFineValidita: '2025-06-30',
        decretoRiferimento: 'MEF - Semestre 1/2025 - GU n.156',
        note: 'Tasso BCE 2.65% + 8% = 10.65%',
      },
      {
        tipo: 'moratorio',
        tassoPercentuale: 10.15,
        dataInizioValidita: '2025-07-01',
        dataFineValidita: '2025-12-31',
        decretoRiferimento: 'MEF - Semestre 2/2025 - GU n.161',
        note: 'Tasso BCE 2.15% + 8% = 10.15%',
      },
    ];

    // Inserimento tassi legali
    for (const tasso of tassiLegali) {
      await queryRunner.query(
        `INSERT INTO tasso_interesse
        (id, tipo, tassoPercentuale, dataInizioValidita, dataFineValidita, decretoRiferimento, note, createdAt, updatedAt)
        VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          tasso.tipo,
          tasso.tassoPercentuale,
          tasso.dataInizioValidita,
          tasso.dataFineValidita,
          tasso.decretoRiferimento,
          tasso.note,
        ],
      );
    }

    // Inserimento tassi moratori
    for (const tasso of tassiMoratori) {
      await queryRunner.query(
        `INSERT INTO tasso_interesse
        (id, tipo, tassoPercentuale, dataInizioValidita, dataFineValidita, decretoRiferimento, note, createdAt, updatedAt)
        VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          tasso.tipo,
          tasso.tassoPercentuale,
          tasso.dataInizioValidita,
          tasso.dataFineValidita,
          tasso.decretoRiferimento,
          tasso.note,
        ],
      );
    }

    console.log(
      `✅ Inseriti ${tassiLegali.length} tassi legali e ${tassiMoratori.length} tassi moratori (2020-2026)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rimuovi tutti i tassi inseriti da questa migration
    await queryRunner.query(
      `DELETE FROM tasso_interesse WHERE decretoRiferimento LIKE '%2020%' OR decretoRiferimento LIKE '%2021%' OR decretoRiferimento LIKE '%2022%' OR decretoRiferimento LIKE '%2023%' OR decretoRiferimento LIKE '%2024%' OR decretoRiferimento LIKE '%2025%' OR decretoRiferimento LIKE '%2026%'`,
    );

    console.log('✅ Rimossi tutti i tassi storici dal 2020 al 2026');
  }
}
