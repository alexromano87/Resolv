import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddInteressiFieldsToPratiche1768100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('pratiche');
    if (!table) {
      return;
    }

    if (!table.findColumnByName('applicaInteressi')) {
      await queryRunner.addColumn(
        'pratiche',
        new TableColumn({
          name: 'applicaInteressi',
          type: 'boolean',
          default: false,
        }),
      );
    }

    if (!table.findColumnByName('tipoInteresse')) {
      await queryRunner.addColumn(
        'pratiche',
        new TableColumn({
          name: 'tipoInteresse',
          type: 'enum',
          enum: ['legale', 'moratorio', 'fisso'],
          isNullable: true,
        }),
      );
    }

    if (!table.findColumnByName('tassoInteresse')) {
      await queryRunner.addColumn(
        'pratiche',
        new TableColumn({
          name: 'tassoInteresse',
          type: 'decimal',
          precision: 5,
          scale: 2,
          isNullable: true,
        }),
      );
    }

    if (!table.findColumnByName('dataInizioInteressi')) {
      await queryRunner.addColumn(
        'pratiche',
        new TableColumn({
          name: 'dataInizioInteressi',
          type: 'date',
          isNullable: true,
        }),
      );
    }

    if (!table.findColumnByName('moratorioPre2013')) {
      await queryRunner.addColumn(
        'pratiche',
        new TableColumn({
          name: 'moratorioPre2013',
          type: 'boolean',
          default: false,
        }),
      );
    }

    if (!table.findColumnByName('moratorioMaggiorazione')) {
      await queryRunner.addColumn(
        'pratiche',
        new TableColumn({
          name: 'moratorioMaggiorazione',
          type: 'boolean',
          default: false,
        }),
      );
    }

    if (!table.findColumnByName('moratorioPctMaggiorazione')) {
      await queryRunner.addColumn(
        'pratiche',
        new TableColumn({
          name: 'moratorioPctMaggiorazione',
          type: 'decimal',
          precision: 5,
          scale: 2,
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('pratiche');
    if (!table) {
      return;
    }

    if (table.findColumnByName('moratorioPctMaggiorazione')) {
      await queryRunner.dropColumn('pratiche', 'moratorioPctMaggiorazione');
    }
    if (table.findColumnByName('moratorioMaggiorazione')) {
      await queryRunner.dropColumn('pratiche', 'moratorioMaggiorazione');
    }
    if (table.findColumnByName('moratorioPre2013')) {
      await queryRunner.dropColumn('pratiche', 'moratorioPre2013');
    }
    if (table.findColumnByName('dataInizioInteressi')) {
      await queryRunner.dropColumn('pratiche', 'dataInizioInteressi');
    }
    if (table.findColumnByName('tassoInteresse')) {
      await queryRunner.dropColumn('pratiche', 'tassoInteresse');
    }
    if (table.findColumnByName('tipoInteresse')) {
      await queryRunner.dropColumn('pratiche', 'tipoInteresse');
    }
    if (table.findColumnByName('applicaInteressi')) {
      await queryRunner.dropColumn('pratiche', 'applicaInteressi');
    }
  }
}
