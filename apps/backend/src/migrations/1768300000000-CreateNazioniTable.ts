import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNazioniTable1768300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS nazioni (
        codice varchar(2) NOT NULL,
        nome varchar(100) NOT NULL,
        attiva tinyint(1) NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (codice),
        INDEX idx_nazioni_nome (nome)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const fallback = [
      { code: 'IT', name: 'Italia' },
      { code: 'FR', name: 'Francia' },
      { code: 'DE', name: 'Germania' },
      { code: 'ES', name: 'Spagna' },
      { code: 'GB', name: 'Regno Unito' },
      { code: 'US', name: 'Stati Uniti' },
      { code: 'CH', name: 'Svizzera' },
      { code: 'AT', name: 'Austria' },
      { code: 'BE', name: 'Belgio' },
      { code: 'NL', name: 'Paesi Bassi' },
    ];

    let countries: Array<{ code: string; name: string }> = [];
    try {
      const regionCodes = (Intl as any).supportedValuesOf
        ? (Intl as any).supportedValuesOf('region')
        : [];
      const displayNames = new Intl.DisplayNames(['it'], { type: 'region' });
      countries = regionCodes
        .filter((code: string) => code.length === 2)
        .map((code: string) => ({
          code,
          name: displayNames.of(code) || code,
        }))
        .filter((item: { code: string; name: string }) => item.name && item.name !== item.code);
    } catch (error) {
      countries = fallback;
    }

    if (countries.length === 0) {
      countries = fallback;
    }

    const unique = new Map<string, string>();
    for (const item of countries) {
      unique.set(item.code.toUpperCase(), item.name);
    }

    for (const [code, name] of unique.entries()) {
      await queryRunner.query(
        `INSERT INTO nazioni (codice, nome, attiva, createdAt, updatedAt)
         VALUES (?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE nome = VALUES(nome), attiva = 1`,
        [code, name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS nazioni');
  }
}
