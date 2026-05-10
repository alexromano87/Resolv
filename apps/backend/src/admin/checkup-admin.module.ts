import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckupStudio } from '../checkup/studios/checkup-studio.entity';
import { CheckupClient } from '../checkup/clients/checkup-client.entity';
import { CheckupUser } from '../checkup/users/checkup-user.entity';
import { CheckupLicense } from '../checkup/licenses/checkup-license.entity';
import { CheckupSublicense } from '../checkup/licenses/checkup-sublicense.entity';
import { CheckupAnagraficaLicenziatario } from '../checkup/anagrafiche/checkup-anagrafica-licenziatario.entity';
import { CheckupPreassessment } from '../checkup/preassessment/checkup-preassessment.entity';
import { QuestionMacroArea } from '../checkup/entities/question-macro-area.entity';
import { QuestionSection } from '../checkup/entities/question-section.entity';
import { QuestionField } from '../checkup/entities/question-field.entity';
import { QuestionModel } from '../checkup/entities/question-model.entity';
import { CheckupPdfConfig } from '../checkup/entities/checkup-pdf-config.entity';
import { CheckupAdminController } from './checkup-admin.controller';
import { QuestionManagementService } from '../checkup/services/question-management.service';
import { CheckupPreassessmentRenderService } from '../checkup/preassessment/checkup-preassessment-render.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CheckupStudio,
      CheckupClient,
      CheckupUser,
      CheckupLicense,
      CheckupSublicense,
      CheckupAnagraficaLicenziatario,
      CheckupPreassessment,
      QuestionMacroArea,
      QuestionSection,
      QuestionField,
      QuestionModel,
      CheckupPdfConfig,
    ]),
  ],
  controllers: [CheckupAdminController],
  providers: [QuestionManagementService, CheckupPreassessmentRenderService],
})
export class CheckupAdminModule {}
