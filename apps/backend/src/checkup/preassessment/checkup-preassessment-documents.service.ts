import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { CheckupPreassessmentDocument, CheckupPreassessmentDocumentType } from './checkup-preassessment-document.entity';
import { CheckupPreassessmentService } from './checkup-preassessment.service';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

const unlinkAsync = promisify(fs.unlink);

/** Canonical base directory for all checkup document uploads. */
const UPLOAD_BASE = path.resolve(process.cwd(), 'uploads', 'checkup-preassessment');

@Injectable()
export class CheckupPreassessmentDocumentsService {
  private readonly logger = new Logger(CheckupPreassessmentDocumentsService.name);

  constructor(
    @InjectRepository(CheckupPreassessmentDocument)
    private documentRepository: Repository<CheckupPreassessmentDocument>,
    private preassessmentService: CheckupPreassessmentService,
  ) {}

  private getDocumentType(ext: string): CheckupPreassessmentDocumentType {
    const extLower = ext.toLowerCase().replace('.', '');
    const mapping: Record<string, CheckupPreassessmentDocumentType> = {
      pdf: 'pdf',
      doc: 'word',
      docx: 'word',
      xls: 'excel',
      xlsx: 'excel',
      jpg: 'immagine',
      jpeg: 'immagine',
      png: 'immagine',
      gif: 'immagine',
      csv: 'csv',
      xml: 'xml',
    };
    return mapping[extLower] || 'altro';
  }

  /**
   * Prevents path traversal attacks by ensuring the resolved file path
   * stays within the allowed upload directory.
   * Throws InternalServerErrorException if the path escapes the sandbox.
   */
  private assertSafePath(percorsoFile: string): void {
    const resolved = path.resolve(percorsoFile);
    if (!resolved.startsWith(UPLOAD_BASE + path.sep) && resolved !== UPLOAD_BASE) {
      // Log without exposing the path to the client
      this.logger.error(`Path traversal attempt blocked. Resolved path outside upload dir.`);
      throw new InternalServerErrorException('Percorso file non valido');
    }
  }

  private canEdit(preassessment: { clientId: string; studioCanEdit: boolean }, user: CheckupCurrentUserData) {
    if (user.clientId && user.clientId === preassessment.clientId) return true;
    if (user.ruolo !== 'cliente') return true;
    return false;
  }

  async upload(
    preassessmentId: string,
    file: Express.Multer.File,
    user: CheckupCurrentUserData,
    fieldId: string,
    sectionId?: string,
  ): Promise<CheckupPreassessmentDocument> {
    if (!fieldId) {
      throw new NotFoundException('Campo non specificato');
    }
    const { preassessment, allowDocuments } = await this.preassessmentService.getPreassessmentForDocuments(
      preassessmentId,
      user,
    );
    if (!this.canEdit(preassessment, user)) {
      throw new ForbiddenException('Modifiche non autorizzate');
    }
    if (!allowDocuments) {
      throw new ForbiddenException('Caricamento documenti non consentito');
    }

    const ext = path.extname(file.originalname);
    const doc = this.documentRepository.create({
      preassessmentId,
      fieldId,
      sectionId: sectionId || null,
      nome: file.filename,
      nomeOriginale: file.originalname,
      percorsoFile: file.path,
      estensione: ext,
      tipo: this.getDocumentType(ext),
      dimensione: file.size,
      caricatoDa: user.id,
    });

    return this.documentRepository.save(doc);
  }

  async findByPreassessment(
    preassessmentId: string,
    user: CheckupCurrentUserData,
    sectionId?: string,
    fieldId?: string,
  ): Promise<CheckupPreassessmentDocument[]> {
    await this.preassessmentService.getPreassessmentForDocuments(preassessmentId, user);

    const qb = this.documentRepository
      .createQueryBuilder('d')
      .where('d.preassessmentId = :preassessmentId', { preassessmentId })
      .andWhere('d.attivo = :attivo', { attivo: true });

    if (sectionId) {
      qb.andWhere('d.sectionId = :sectionId', { sectionId });
    }
    if (fieldId) {
      qb.andWhere('d.fieldId = :fieldId', { fieldId });
    }

    qb.orderBy('d.createdAt', 'DESC');
    return qb.getMany();
  }

  async getFileStream(
    id: string,
    user: CheckupCurrentUserData,
  ): Promise<{ stream: fs.ReadStream; document: CheckupPreassessmentDocument }> {
    const doc = await this.documentRepository.findOne({
      where: { id, attivo: true },
      relations: ['preassessment'],
    });

    if (!doc) {
      throw new NotFoundException('Documento non trovato');
    }

    await this.preassessmentService.getPreassessmentForDocuments(doc.preassessmentId, user);

    this.assertSafePath(doc.percorsoFile);
    const stream = fs.createReadStream(doc.percorsoFile);
    return { stream, document: doc };
  }

  async remove(id: string, user: CheckupCurrentUserData): Promise<void> {
    const doc = await this.documentRepository.findOne({
      where: { id, attivo: true },
      relations: ['preassessment'],
    });

    if (!doc) {
      throw new NotFoundException('Documento non trovato');
    }

    const { preassessment } = await this.preassessmentService.getPreassessmentForDocuments(doc.preassessmentId, user);
    if (!this.canEdit(preassessment, user)) {
      throw new ForbiddenException('Modifiche non autorizzate');
    }

    doc.attivo = false;
    await this.documentRepository.save(doc);

    try {
      this.assertSafePath(doc.percorsoFile);
      await unlinkAsync(doc.percorsoFile);
    } catch {
      // ignore — file may already be missing, or path validation logged the issue
    }
  }
}
