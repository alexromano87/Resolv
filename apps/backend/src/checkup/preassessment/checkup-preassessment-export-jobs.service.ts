import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { promises as fsp } from 'fs';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupPreassessmentExportJob } from './checkup-preassessment-export-job.entity';
import { CheckupPreassessmentDocumentsService } from './checkup-preassessment-documents.service';
import { CheckupPreassessmentRenderService } from './checkup-preassessment-render.service';

const EXPORT_DIR = path.resolve(process.cwd(), 'uploads', 'checkup-exports');
const JOB_RETENTION_HOURS = 24;

/**
 * [L-02] Verifica che filePath sia all'interno di EXPORT_DIR.
 * Impedisce path traversal nel caso in cui job.resultPath fosse manipolato
 * (es. via bug nell'upsert o injection SQL teorica).
 */
function assertSafeExportPath(filePath: string): void {
  const resolved = path.resolve(filePath);
  const safeBase = EXPORT_DIR + path.sep;
  if (!resolved.startsWith(safeBase) && resolved !== EXPORT_DIR) {
    throw new Error(`[L-02] Path traversal bloccato: percorso fuori dalla directory di export consentita.`);
  }
}

@Injectable()
export class CheckupPreassessmentExportJobsService implements OnModuleInit {
  private readonly logger = new Logger(CheckupPreassessmentExportJobsService.name);
  private processing = false;

  constructor(
    @InjectRepository(CheckupPreassessmentExportJob)
    private readonly jobRepository: Repository<CheckupPreassessmentExportJob>,
    private readonly documentsService: CheckupPreassessmentDocumentsService,
    private readonly renderService: CheckupPreassessmentRenderService,
  ) {}


  async onModuleInit() {
    await this.jobRepository.update({ status: 'processing' }, {
      status: 'queued',
      startedAt: null,
      errorMessage: 'Job ripristinato dopo il riavvio del servizio',
    });
    this.scheduleProcessing();
  }

  private ensureExportDir() {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  private toJobUser(job: CheckupPreassessmentExportJob): CheckupCurrentUserData {
    return {
      id: job.requestedById,
      ruolo: job.requestedByRole as any,
      studioId: job.requestedByStudioId,
      clientId: job.requestedByClientId,
    } as CheckupCurrentUserData;
  }

  private async writeJobFile(jobId: string, filename: string, content: Buffer): Promise<string> {
    this.ensureExportDir();
    const target = path.join(EXPORT_DIR, `${jobId}-${filename}`);
    await fsp.writeFile(target, content);
    return target;
  }

  private scheduleProcessing() {
    if (this.processing) return;
    setTimeout(() => {
      void this.processQueue();
    }, 0);
  }

  async createPdfJob(html: string, user: CheckupCurrentUserData) {
    if (!html || typeof html !== 'string') {
      throw new BadRequestException('HTML mancante');
    }
    const job = this.jobRepository.create({
      type: 'pdf',
      status: 'queued',
      requestedById: user.id,
      requestedByRole: user.ruolo,
      requestedByStudioId: user.studioId || null,
      requestedByClientId: user.clientId || null,
      payload: { html },
      filename: `pre_assessment_${new Date().toISOString().slice(0, 10)}.pdf`,
      mimeType: 'application/pdf',
    });
    const saved = await this.jobRepository.save(job);
    this.scheduleProcessing();
    return this.toResponse(saved);
  }

  async createZipJob(preassessmentId: string, user: CheckupCurrentUserData) {
    const preview = await this.documentsService.getZipPreview(preassessmentId, user);
    const job = this.jobRepository.create({
      type: 'zip',
      status: 'queued',
      requestedById: user.id,
      requestedByRole: user.ruolo,
      requestedByStudioId: user.studioId || null,
      requestedByClientId: user.clientId || null,
      preassessmentId,
      clientId: preview.clientId,
      filename: preview.filename,
      mimeType: 'application/zip',
    });
    const saved = await this.jobRepository.save(job);
    this.scheduleProcessing();
    return this.toResponse(saved);
  }

  private toResponse(job: CheckupPreassessmentExportJob) {
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      filename: job.filename,
      mimeType: job.mimeType,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  async getJob(jobId: string, user: CheckupCurrentUserData) {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job di esportazione non trovato');
    if (job.requestedById !== user.id) {
      throw new ForbiddenException('Accesso non autorizzato al job di esportazione');
    }
    return this.toResponse(job);
  }

  async getJobFile(jobId: string, user: CheckupCurrentUserData) {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job di esportazione non trovato');
    if (job.requestedById !== user.id) {
      throw new ForbiddenException('Accesso non autorizzato al job di esportazione');
    }
    if (job.status !== 'completed' || !job.resultPath || !job.filename || !job.mimeType) {
      throw new BadRequestException("Il file esportato non e' ancora disponibile");
    }
    // [L-02] Verifica path traversal prima di esporre il percorso al controller
    assertSafeExportPath(job.resultPath);

    if (!fs.existsSync(job.resultPath)) {
      throw new NotFoundException('File esportato non trovato');
    }
    return {
      path: job.resultPath,
      filename: job.filename,
      mimeType: job.mimeType,
    };
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;
    try {
      while (true) {
        const next = await this.jobRepository.findOne({
          where: { status: 'queued' },
          order: { createdAt: 'ASC' },
        });
        if (!next) break;

        next.status = 'processing';
        next.startedAt = new Date();
        next.attempts += 1;
        next.errorMessage = null;
        await this.jobRepository.save(next);

        try {
          if (next.type === 'pdf') {
            const pdf = await this.renderService.renderHtmlToPdf(next.payload?.html || '');
            const filename = next.filename || `pre_assessment_${new Date().toISOString().slice(0, 10)}.pdf`;
            next.resultPath = await this.writeJobFile(next.id, filename, pdf);
            next.filename = filename;
            next.mimeType = 'application/pdf';
          } else if (next.type === 'zip') {
            if (!next.preassessmentId) {
              throw new BadRequestException('Preassessment mancante per lo zip');
            }
            const zip = await this.documentsService.createZipBuffer(next.preassessmentId, this.toJobUser(next));
            const filename = next.filename || 'documenti.zip';
            next.resultPath = await this.writeJobFile(next.id, filename, zip.buffer);
            next.filename = filename;
            next.mimeType = 'application/zip';
          }
          next.status = 'completed';
          next.completedAt = new Date();
          await this.jobRepository.save(next);
        } catch (error: any) {
          next.status = 'failed';
          next.errorMessage = error?.message || "Errore durante l'esportazione";
          next.completedAt = new Date();
          await this.jobRepository.save(next);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  @Cron('15 * * * *')
  async cleanupExpiredJobs() {
    const cutoff = new Date(Date.now() - JOB_RETENTION_HOURS * 60 * 60 * 1000);
    const jobs = await this.jobRepository.find({
      where: [
        { completedAt: LessThan(cutoff) },
        { status: 'failed', completedAt: LessThan(cutoff) },
      ],
    });
    for (const job of jobs) {
      if (job.resultPath && fs.existsSync(job.resultPath)) {
        try {
          // [L-02] Verifica path traversal anche in fase di cleanup
          assertSafeExportPath(job.resultPath);
          await fsp.unlink(job.resultPath);
        } catch (error: any) {
          this.logger.warn(`Impossibile rimuovere il file del job ${job.id}: ${error?.message || 'errore sconosciuto'}`);
        }
      }
      await this.jobRepository.delete(job.id);
    }
  }
}
