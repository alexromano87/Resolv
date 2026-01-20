import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ottimizzazioni: indici sui campi pratica e partizionamento movimenti.
 */
export class Optimizations1703797334000 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Gli indici IDX_* sono già creati nella migrazione InitSchema, quindi li saltiamo qui
    // Questi indici sono già presenti nello schema iniziale

    // Verifichiamo e creiamo solo il partitioning per movimenti_finanziari
    // che non è presente nello schema iniziale
    const hasPartitions = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.PARTITIONS
      WHERE TABLE_SCHEMA = 'recupero_crediti'
      AND TABLE_NAME = 'movimenti_finanziari'
      AND PARTITION_NAME IS NOT NULL
    `);

    if (hasPartitions[0].count === 0) {
      await queryRunner.query(`
        ALTER TABLE movimenti_finanziari
        PARTITION BY RANGE (YEAR(data)) (
          PARTITION p_before_2023 VALUES LESS THAN (2023),
          PARTITION p_2023 VALUES LESS THAN (2024),
          PARTITION p_2024 VALUES LESS THAN (2025),
          PARTITION p_future VALUES LESS THAN MAXVALUE
        );
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rimuovi solo il partitioning, gli indici fanno parte dello schema base
    await queryRunner.query(`ALTER TABLE movimenti_finanziari REMOVE PARTITIONING;`);
  }
}
