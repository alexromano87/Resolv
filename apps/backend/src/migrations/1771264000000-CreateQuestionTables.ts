import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateQuestionTables1771264000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create checkup_question_macro_areas table
    await queryRunner.createTable(
      new Table({
        name: 'checkup_question_macro_areas',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '10',
            isUnique: true,
          },
          {
            name: 'label',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'color',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'sortOrder',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create checkup_question_sections table
    await queryRunner.createTable(
      new Table({
        name: 'checkup_question_sections',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'macroAreaId',
            type: 'int',
          },
          {
            name: 'sortOrder',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key for macroAreaId
    await queryRunner.createForeignKey(
      'checkup_question_sections',
      new TableForeignKey({
        columnNames: ['macroAreaId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'checkup_question_macro_areas',
        onDelete: 'CASCADE',
      }),
    );

    // Create checkup_question_fields table
    await queryRunner.createTable(
      new Table({
        name: 'checkup_question_fields',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'fieldId',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'label',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'options',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'required',
            type: 'boolean',
            default: false,
          },
          {
            name: 'help',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sectionId',
            type: 'int',
          },
          {
            name: 'sortOrder',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key for sectionId
    await queryRunner.createForeignKey(
      'checkup_question_fields',
      new TableForeignKey({
        columnNames: ['sectionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'checkup_question_sections',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('checkup_question_fields');
    await queryRunner.dropTable('checkup_question_sections');
    await queryRunner.dropTable('checkup_question_macro_areas');
  }
}
