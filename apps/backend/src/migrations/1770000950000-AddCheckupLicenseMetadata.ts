import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCheckupLicenseMetadata1770000950000 implements MigrationInterface {
  name = 'AddCheckupLicenseMetadata1770000950000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'checkup_licenses',
      new TableColumn({
        name: 'numeroLicenza',
        type: 'varchar',
        length: '16',
        isNullable: true,
        isUnique: true,
      }),
    );

    await queryRunner.addColumn(
      'checkup_licenses',
      new TableColumn({
        name: 'dataInizioValidita',
        type: 'date',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'checkup_licenses',
      new TableColumn({
        name: 'dataScadenza',
        type: 'date',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('checkup_licenses', 'dataScadenza');
    await queryRunner.dropColumn('checkup_licenses', 'dataInizioValidita');
    await queryRunner.dropColumn('checkup_licenses', 'numeroLicenza');
  }
}
