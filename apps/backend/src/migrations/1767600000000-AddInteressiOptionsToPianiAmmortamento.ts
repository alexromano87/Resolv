import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddInteressiOptionsToPianiAmmortamento1767600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('piani_ammortamento', [
      new TableColumn({
        name: 'moratorioPre2013',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'moratorioMaggiorazione',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'moratorioPctMaggiorazione',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: true,
      }),
      new TableColumn({
        name: 'applicaArt1194',
        type: 'boolean',
        default: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('piani_ammortamento', 'applicaArt1194');
    await queryRunner.dropColumn('piani_ammortamento', 'moratorioPctMaggiorazione');
    await queryRunner.dropColumn('piani_ammortamento', 'moratorioMaggiorazione');
    await queryRunner.dropColumn('piani_ammortamento', 'moratorioPre2013');
  }
}
