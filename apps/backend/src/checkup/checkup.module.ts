import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';

// Entities
import { CheckupUser } from './users/checkup-user.entity';
import { CheckupTemplate } from './templates/checkup-template.entity';
import { CheckupSection } from './templates/checkup-section.entity';
import { CheckupQuestion } from './templates/checkup-question.entity';
import { CheckupQuestionnaire } from './questionnaires/checkup-questionnaire.entity';
import { CheckupAnswer } from './answers/checkup-answer.entity';
import { CheckupDocument } from './documents/checkup-document.entity';
import { CheckupChatMessage } from './chat/checkup-chat-message.entity';
import { CheckupPreassessment } from './preassessment/checkup-preassessment.entity';
import { CheckupPreassessmentMessage } from './preassessment/checkup-preassessment-message.entity';
import { CheckupPreassessmentTicket } from './preassessment/checkup-preassessment-ticket.entity';
import { CheckupPreassessmentTicketMessage } from './preassessment/checkup-preassessment-ticket-message.entity';
import { CheckupPreassessmentAlert } from './preassessment/checkup-preassessment-alert.entity';
import { CheckupPreassessmentDocument } from './preassessment/checkup-preassessment-document.entity';
import { CheckupStudio } from './studios/checkup-studio.entity';
import { CheckupLicense } from './licenses/checkup-license.entity';
import { CheckupSublicense } from './licenses/checkup-sublicense.entity';

// Auth
import { CheckupJwtStrategy } from './auth/checkup-jwt.strategy';
import { CheckupAuthService } from './auth/checkup-auth.service';
import { CheckupAuthController } from './auth/checkup-auth.controller';

// Users
import { CheckupUsersService } from './users/checkup-users.service';
import { CheckupUsersController } from './users/checkup-users.controller';

// Templates
import { CheckupTemplatesService } from './templates/checkup-templates.service';
import { CheckupTemplatesController } from './templates/checkup-templates.controller';

// Questionnaires
import { CheckupQuestionnairesService } from './questionnaires/checkup-questionnaires.service';
import { CheckupQuestionnairesController } from './questionnaires/checkup-questionnaires.controller';

// Answers
import { CheckupAnswersService } from './answers/checkup-answers.service';
import { CheckupAnswersController } from './answers/checkup-answers.controller';

// Documents
import { CheckupDocumentsService } from './documents/checkup-documents.service';
import { CheckupDocumentsController } from './documents/checkup-documents.controller';

// Chat
import { CheckupChatService } from './chat/checkup-chat.service';
import { CheckupChatController } from './chat/checkup-chat.controller';
import { CheckupPreassessmentService } from './preassessment/checkup-preassessment.service';
import { CheckupPreassessmentController } from './preassessment/checkup-preassessment.controller';
import { CheckupPreassessmentChatService } from './preassessment/checkup-preassessment-chat.service';
import { CheckupPreassessmentChatController } from './preassessment/checkup-preassessment-chat.controller';
import { CheckupPreassessmentThreadsService } from './preassessment/checkup-preassessment-threads.service';
import { CheckupPreassessmentThreadsController } from './preassessment/checkup-preassessment-threads.controller';
import { CheckupPreassessmentDocumentsService } from './preassessment/checkup-preassessment-documents.service';
import { CheckupPreassessmentDocumentsController } from './preassessment/checkup-preassessment-documents.controller';
import { CheckupStudiosService } from './studios/checkup-studios.service';
import { CheckupStudiosController } from './studios/checkup-studios.controller';
import { CheckupClient } from './clients/checkup-client.entity';

// Question Management
import { QuestionMacroArea } from './entities/question-macro-area.entity';
import { QuestionSection } from './entities/question-section.entity';
import { QuestionField } from './entities/question-field.entity';
import { QuestionManagementService } from './services/question-management.service';
import { QuestionManagementController } from './controllers/question-management.controller';
import { QuestionSeedService } from './services/question-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CheckupUser,
      CheckupTemplate,
      CheckupSection,
      CheckupQuestion,
      CheckupQuestionnaire,
      CheckupAnswer,
      CheckupDocument,
      CheckupChatMessage,
      CheckupPreassessment,
      CheckupPreassessmentMessage,
      CheckupPreassessmentTicket,
      CheckupPreassessmentTicketMessage,
      CheckupPreassessmentAlert,
      CheckupPreassessmentDocument,
      CheckupStudio,
      CheckupClient,
      CheckupLicense,
      CheckupSublicense,
      QuestionMacroArea,
      QuestionSection,
      QuestionField,
    ]),
    PassportModule.register({ defaultStrategy: 'checkup-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: (() => {
          const secret = configService.get<string>('CHECKUP_JWT_SECRET');
          if (!secret) {
            throw new Error('FATAL: CHECKUP_JWT_SECRET environment variable is not set. Server cannot start without it.');
          }
          return secret;
        })(),
        signOptions: { expiresIn: '24h' },
      }),
    }),
    NotificationsModule,
  ],
  controllers: [
    CheckupAuthController,
    CheckupUsersController,
    CheckupTemplatesController,
    CheckupQuestionnairesController,
    CheckupAnswersController,
    CheckupDocumentsController,
    CheckupChatController,
    CheckupPreassessmentController,
    CheckupPreassessmentChatController,
    CheckupPreassessmentThreadsController,
    CheckupPreassessmentDocumentsController,
    CheckupStudiosController,
    QuestionManagementController,
  ],
  providers: [
    CheckupJwtStrategy,
    CheckupAuthService,
    CheckupUsersService,
    CheckupTemplatesService,
    CheckupQuestionnairesService,
    CheckupAnswersService,
    CheckupDocumentsService,
    CheckupChatService,
    CheckupPreassessmentService,
    CheckupPreassessmentChatService,
    CheckupPreassessmentThreadsService,
    CheckupPreassessmentDocumentsService,
    CheckupStudiosService,
    QuestionManagementService,
    QuestionSeedService,
  ],
})
export class CheckupModule {}
