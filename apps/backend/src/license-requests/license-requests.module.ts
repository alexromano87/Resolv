import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenseRequest } from './license-request.entity';
import { LicenseRequestsService } from './license-requests.service';
import { PublicLicenseRequestsController } from './public-license-requests.controller';
import { AdminLicenseRequestsController } from './admin-license-requests.controller';
import { StudiModule } from '../studi/studi.module';

@Module({
  imports: [TypeOrmModule.forFeature([LicenseRequest]), StudiModule],
  providers: [LicenseRequestsService],
  controllers: [PublicLicenseRequestsController, AdminLicenseRequestsController],
})
export class LicenseRequestsModule {}
