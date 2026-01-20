import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSoftDeleteToStudi1735567800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deletedAt column to studi table for soft delete
    await queryRunner.addColumn(
      'studi',
      new TableColumn({
        name: 'deletedAt',
        type: 'timestamp',
        isNullable: true,
        default: null,
      }),
    );

    // Add index on deletedAt for better query performance
    await queryRunner.query(
      'CREATE INDEX IDX_STUDI_DELETED_AT ON studi(deletedAt)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query('DROP INDEX IDX_STUDI_DELETED_AT ON studi');

    // Drop column
    await queryRunner.dropColumn('studi', 'deletedAt');
  }
}
