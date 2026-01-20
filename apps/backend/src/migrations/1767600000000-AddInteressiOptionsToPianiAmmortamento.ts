import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddInteressiOptionsToPianiAmmortamento1767600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('piani_ammortamento');
    if (!table) {
      return;
    }

    if (!table.findColumnByName('moratorioPre2013')) {
      await queryRunner.addColumn(
        'piani_ammortamento',
        new TableColumn({
          name: 'moratorioPre2013',
          type: 'boolean',
          default: false,
        }),
      );
    }

    if (!table.findColumnByName('moratorioMaggiorazione')) {
      await queryRunner.addColumn(
        'piani_ammortamento',
        new TableColumn({
          name: 'moratorioMaggiorazione',
          type: 'boolean',
          default: false,
        }),
      );
    }

    if (!table.findColumnByName('moratorioPctMaggiorazione')) {
      await queryRunner.addColumn(
        'piani_ammortamento',
        new TableColumn({
          name: 'moratorioPctMaggiorazione',
          type: 'decimal',
          precision: 5,
          scale: 2,
          isNullable: true,
        }),
      );
    }

    if (!table.findColumnByName('applicaArt1194')) {
      await queryRunner.addColumn(
        'piani_ammortamento',
        new TableColumn({
          name: 'applicaArt1194',
          type: 'boolean',
          default: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('piani_ammortamento');
    if (!table) {
      return;
    }

    if (table.findColumnByName('applicaArt1194')) {
      await queryRunner.dropColumn('piani_ammortamento', 'applicaArt1194');
    }
    if (table.findColumnByName('moratorioPctMaggiorazione')) {
      await queryRunner.dropColumn('piani_ammortamento', 'moratorioPctMaggiorazione');
    }
    if (table.findColumnByName('moratorioMaggiorazione')) {
      await queryRunner.dropColumn('piani_ammortamento', 'moratorioMaggiorazione');
    }
    if (table.findColumnByName('moratorioPre2013')) {
      await queryRunner.dropColumn('piani_ammortamento', 'moratorioPre2013');
    }
  }
}
