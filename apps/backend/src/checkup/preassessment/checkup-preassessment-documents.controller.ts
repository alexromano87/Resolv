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
import { CheckupPreassessmentExportJobsService } from './checkup-preassessment-export-jobs.service';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { validateMagicBytes } from '../documents/checkup-file-utils';
import * as fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads', 'checkup-preassessment');
const MAX_UPLOAD_SIZE_BYTES = 30 * 1024 * 1024;

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

const MIME_TYPE_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
};

const resolveMimeType = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPE_BY_EXT[ext] || 'application/octet-stream';
};

@Controller('checkup')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupPreassessmentDocumentsController {
  constructor(
    private readonly documentsService: CheckupPreassessmentDocumentsService,
    private readonly exportJobsService: CheckupPreassessmentExportJobsService,
  ) {}

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
      limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
      fileFilter,
    }),
  )
  async upload(
    @Param('preassessmentId') preassessmentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Body('fieldId') fieldId: string,
    @Body('sectionId') sectionId?: string,
  ) {
    // Validate magic bytes: ensures the actual file content matches the declared MIME type
    const valid = await validateMagicBytes(file.path, file.mimetype);
    if (!valid) {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      throw new BadRequestException('Il contenuto del file non corrisponde al tipo dichiarato');
    }
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
      'Content-Type': resolveMimeType(document.nomeOriginale),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(document.nomeOriginale)}"`,
    });
    stream.pipe(res);
  }

  @Post('preassessment/:preassessmentId/documents/download-zip/jobs')
  async createZipJob(
    @Param('preassessmentId') preassessmentId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.exportJobsService.createZipJob(preassessmentId, user);
  }

  @Delete('preassessment/documents/:id')
  remove(
    @Param('id') id: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.documentsService.remove(id, user);
  }
}
