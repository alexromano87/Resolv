import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterStudioLogoUrlToLongtext1773001800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`checkup_studios\` MODIFY COLUMN \`logoUrl\` LONGTEXT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`checkup_studios\` MODIFY COLUMN \`logoUrl\` VARCHAR(255) NULL`,
    );
  }
}
