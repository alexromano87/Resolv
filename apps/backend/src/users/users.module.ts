// apps/backend/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Studio } from '../studi/studio.entity';
import { UsersController } from './users.controller';
import { CollaboratoriController } from './collaboratori.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Studio])],
  controllers: [UsersController, CollaboratoriController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
