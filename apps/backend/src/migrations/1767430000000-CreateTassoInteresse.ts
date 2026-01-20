import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTassoInteresse1767430000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tasso_interesse',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'tipo',
            type: 'enum',
            enum: ['legale', 'moratorio'],
            isNullable: false,
          },
          {
            name: 'tassoPercentuale',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'dataInizioValidita',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'dataFineValidita',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'decretoRiferimento',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tasso_interesse',
      new TableIndex({
        name: 'idx_tasso_interesse_tipo_validita',
        columnNames: ['tipo', 'dataInizioValidita', 'dataFineValidita'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('tasso_interesse', 'idx_tasso_interesse_tipo_validita');
    await queryRunner.dropTable('tasso_interesse');
  }
}
