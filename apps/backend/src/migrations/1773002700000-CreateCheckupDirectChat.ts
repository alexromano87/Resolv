import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckupDirectChat1773002700000 implements MigrationInterface {
  name = 'CreateCheckupDirectChat1773002700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS checkup_direct_chat_conversations (
        id char(36) NOT NULL,
        userOneId char(36) NOT NULL,
        userTwoId char(36) NOT NULL,
        studioId char(36) NULL,
        clientId char(36) NULL,
        createdById char(36) NOT NULL,
        lastMessageAt datetime NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_checkup_direct_chat_conversations_pair (userOneId, userTwoId),
        KEY IDX_checkup_direct_chat_conversations_user_one (userOneId),
        KEY IDX_checkup_direct_chat_conversations_user_two (userTwoId),
        KEY IDX_checkup_direct_chat_conversations_studio (studioId),
        KEY IDX_checkup_direct_chat_conversations_client (clientId),
        KEY IDX_checkup_direct_chat_conversations_created_by (createdById),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_direct_chat_conversations_user_one FOREIGN KEY (userOneId) REFERENCES checkup_users(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_direct_chat_conversations_user_two FOREIGN KEY (userTwoId) REFERENCES checkup_users(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_direct_chat_conversations_created_by FOREIGN KEY (createdById) REFERENCES checkup_users(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_direct_chat_conversations_studio FOREIGN KEY (studioId) REFERENCES checkup_studios(id) ON DELETE SET NULL,
        CONSTRAINT FK_checkup_direct_chat_conversations_client FOREIGN KEY (clientId) REFERENCES checkup_clients(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS checkup_direct_chat_messages (
        id char(36) NOT NULL,
        conversationId char(36) NOT NULL,
        userId char(36) NOT NULL,
        messaggio text NOT NULL,
        letto tinyint NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        KEY IDX_checkup_direct_chat_messages_conversation (conversationId),
        KEY IDX_checkup_direct_chat_messages_user (userId),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_direct_chat_messages_conversation FOREIGN KEY (conversationId) REFERENCES checkup_direct_chat_conversations(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_direct_chat_messages_user FOREIGN KEY (userId) REFERENCES checkup_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS checkup_direct_chat_messages');
    await queryRunner.query('DROP TABLE IF EXISTS checkup_direct_chat_conversations');
  }
}
