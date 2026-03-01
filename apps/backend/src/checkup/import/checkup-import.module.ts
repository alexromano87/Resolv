import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckupStudio } from '../studios/checkup-studio.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupPreassessment } from '../preassessment/checkup-preassessment.entity';
import { QuestionModel } from '../entities/question-model.entity';
import { QuestionMacroArea } from '../entities/question-macro-area.entity';
import { QuestionSection } from '../entities/question-section.entity';
import { QuestionField } from '../entities/question-field.entity';
import { CheckupAuditLogModule } from '../audit/checkup-audit-log.module';
import { CheckupImportController } from './checkup-import.controller';
import { CheckupImportService } from './checkup-import.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CheckupStudio,
      CheckupClient,
      CheckupUser,
      CheckupLicense,
      CheckupSublicense,
      CheckupPreassessment,
      QuestionModel,
      QuestionMacroArea,
      QuestionSection,
      QuestionField,
    ]),
    CheckupAuditLogModule,
  ],
  controllers: [CheckupImportController],
  providers: [CheckupImportService],
})
export class CheckupImportModule {}
