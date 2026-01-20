import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDataFineMaturazione1736795000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('pratiche');

    // Verifica se la colonna esiste già
    const dataFineMaturCol = table?.findColumnByName('dataFineMaturazione');

    if (!dataFineMaturCol) {
      await queryRunner.addColumn(
        'pratiche',
        new TableColumn({
          name: 'dataFineMaturazione',
          type: 'date',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('pratiche', 'dataFineMaturazione');
  }
}
