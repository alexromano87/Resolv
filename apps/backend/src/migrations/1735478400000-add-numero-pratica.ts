import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNumeroPratica1735478400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add numeroPratica column
    await queryRunner.addColumn(
      'pratiche',
      new TableColumn({
        name: 'numeroPratica',
        type: 'varchar',
        length: '50',
        isNullable: true,
        isUnique: true,
      }),
    );

    // Generate numero pratica for existing records
    const pratiche = await queryRunner.query(
      `SELECT id, YEAR(createdAt) as anno FROM pratiche ORDER BY createdAt ASC`,
    );

    // Group by year and generate progressive numbers
    const counterByYear: { [year: string]: number } = {};

    for (const pratica of pratiche) {
      const anno = pratica.anno || new Date().getFullYear();
      if (!counterByYear[anno]) {
        counterByYear[anno] = 1;
      } else {
        counterByYear[anno]++;
      }

      const numeroPratica = `${counterByYear[anno]}/${anno}`;
      await queryRunner.query(
        `UPDATE pratiche SET numeroPratica = ? WHERE id = ?`,
        [numeroPratica, pratica.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('pratiche', 'numeroPratica');
  }
}
