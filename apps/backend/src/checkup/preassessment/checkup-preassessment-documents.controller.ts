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
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { CheckupPreassessmentDocumentsService } from './checkup-preassessment-documents.service';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

const uploadDir = path.join(process.cwd(), 'uploads', 'checkup-preassessment');

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
]);

const fileFilter = (req: any, file: Express.Multer.File, callback: (err: Error | null, accept: boolean) => void) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new BadRequestException(`Tipo di file non consentito: ${file.mimetype}`), false);
  }
};

@Controller('checkup')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupPreassessmentDocumentsController {
  constructor(private readonly documentsService: CheckupPreassessmentDocumentsService) {}

  @Post('preassessment/:preassessmentId/documents/upload')
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
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter,
    }),
  )
  upload(
    @Param('preassessmentId') preassessmentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Body('fieldId') fieldId: string,
    @Body('sectionId') sectionId?: string,
  ) {
    return this.documentsService.upload(preassessmentId, file, user, fieldId, sectionId);
  }

  @Get('preassessment/:preassessmentId/documents')
  findByPreassessment(
    @Param('preassessmentId') preassessmentId: string,
    @Query('sectionId') sectionId: string,
    @Query('fieldId') fieldId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.documentsService.findByPreassessment(preassessmentId, user, sectionId, fieldId);
  }

  @Get('preassessment/documents/:id/download')
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

  @Delete('preassessment/documents/:id')
  remove(
    @Param('id') id: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.documentsService.remove(id, user);
  }
}
