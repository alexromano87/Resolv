import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckupStudio } from '../checkup/studios/checkup-studio.entity';
import { CheckupClient } from '../checkup/clients/checkup-client.entity';
import { CheckupUser } from '../checkup/users/checkup-user.entity';
import { CheckupLicense } from '../checkup/licenses/checkup-license.entity';
import { CheckupSublicense } from '../checkup/licenses/checkup-sublicense.entity';
import { CheckupAdminController } from './checkup-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CheckupStudio, CheckupClient, CheckupUser, CheckupLicense, CheckupSublicense])],
  controllers: [CheckupAdminController],
})
export class CheckupAdminModule {}
