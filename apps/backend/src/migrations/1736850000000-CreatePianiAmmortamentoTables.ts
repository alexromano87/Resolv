import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePianiAmmortamentoTables1736850000000 implements MigrationInterface {
  name = 'CreatePianiAmmortamentoTables1736850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`piani_ammortamento\` (
        \`id\` varchar(36) NOT NULL,
        \`praticaId\` varchar(36) NOT NULL,
        \`capitaleIniziale\` decimal(12,2) NOT NULL,
        \`numeroRate\` int NOT NULL,
        \`dataInizio\` date NOT NULL,
        \`stato\` varchar(20) NOT NULL DEFAULT 'attivo',
        \`dataChiusura\` date DEFAULT NULL,
        \`importoRecuperato\` decimal(12,2) DEFAULT NULL,
        \`importoInserito\` tinyint NOT NULL DEFAULT 0,
        \`movimentoFinanziarioId\` varchar(36) DEFAULT NULL,
        \`note\` text DEFAULT NULL,
        \`applicaInteressi\` tinyint NOT NULL DEFAULT 0,
        \`tipoInteresse\` enum('legale','moratorio','fisso') DEFAULT NULL,
        \`tassoInteresse\` decimal(5,2) DEFAULT NULL,
        \`tipoAmmortamento\` enum('italiano','francese') NOT NULL DEFAULT 'italiano',
        \`capitalizzazione\` enum('nessuna','trimestrale','semestrale','annuale') NOT NULL DEFAULT 'nessuna',
        \`dataInizioInteressi\` date DEFAULT NULL,
        \`moratorioPre2013\` tinyint NOT NULL DEFAULT 0,
        \`moratorioMaggiorazione\` tinyint NOT NULL DEFAULT 0,
        \`moratorioPctMaggiorazione\` decimal(5,2) DEFAULT NULL,
        \`applicaArt1194\` tinyint NOT NULL DEFAULT 1,
        \`totaleInteressi\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_piani_pratica\` (\`praticaId\`),
        CONSTRAINT \`FK_piani_pratica\` FOREIGN KEY (\`praticaId\`) REFERENCES \`pratiche\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`rate_ammortamento\` (
        \`id\` varchar(36) NOT NULL,
        \`pianoId\` varchar(36) NOT NULL,
        \`numeroRata\` int NOT NULL,
        \`importo\` decimal(10,2) NOT NULL,
        \`quotaCapitale\` decimal(10,2) NOT NULL DEFAULT 0.00,
        \`quotaInteressi\` decimal(10,2) NOT NULL DEFAULT 0.00,
        \`dataScadenza\` date NOT NULL,
        \`pagata\` tinyint NOT NULL DEFAULT 0,
        \`dataPagamento\` date DEFAULT NULL,
        \`metodoPagamento\` varchar(50) DEFAULT NULL,
        \`codicePagamento\` varchar(255) DEFAULT NULL,
        \`ricevutaPath\` varchar(500) DEFAULT NULL,
        \`movimentoFinanziarioId\` varchar(36) DEFAULT NULL,
        \`movimentoInteressiId\` varchar(36) DEFAULT NULL,
        \`note\` text DEFAULT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_rate_piano\` (\`pianoId\`),
        CONSTRAINT \`FK_rate_piano\` FOREIGN KEY (\`pianoId\`) REFERENCES \`piani_ammortamento\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `rate_ammortamento`');
    await queryRunner.query('DROP TABLE IF EXISTS `piani_ammortamento`');
  }
}
