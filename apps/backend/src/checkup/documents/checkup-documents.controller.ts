import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { CheckupDocumentsService } from './checkup-documents.service';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

const uploadDir = path.join(process.cwd(), 'uploads', 'checkup');

@Controller('checkup')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupDocumentsController {
  constructor(private readonly documentsService: CheckupDocumentsService) {}

  @Post('questionnaires/:questionnaireId/documents/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const fs = require('fs');
          fs.mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  upload(
    @Param('questionnaireId') questionnaireId: string,
    @UploadedFile() file: Express.Multer.File,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Body('answerId') answerId?: string,
    @Body('sectionId') sectionId?: string,
  ) {
    return this.documentsService.upload(questionnaireId, file, user, answerId, sectionId);
  }

  @Get('questionnaires/:questionnaireId/documents')
  findByQuestionnaire(
    @Param('questionnaireId') questionnaireId: string,
    @Query('sectionId') sectionId: string,
    @Query('answerId') answerId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.documentsService.findByQuestionnaire(questionnaireId, user, sectionId, answerId);
  }

  @Get('documents/:id/download')
  async download(
    @Param('id') id: string,
    @Res() res: Response,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    const { stream, document } = await this.documentsService.getFileStream(id, user);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(document.nomeOriginale)}"`,
    });
    stream.pipe(res);
  }

  @Delete('documents/:id')
  remove(
    @Param('id') id: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.documentsService.remove(id, user);
  }
}
