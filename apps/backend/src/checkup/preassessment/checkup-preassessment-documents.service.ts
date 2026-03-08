import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { CheckupPreassessmentDocument, CheckupPreassessmentDocumentType } from './checkup-preassessment-document.entity';
import { CheckupPreassessmentService } from './checkup-preassessment.service';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { QuestionManagementService } from '../services/question-management.service';

const unlinkAsync = promisify(fs.unlink);

/** Canonical base directory for all checkup document uploads. */
const UPLOAD_BASE = path.resolve(process.cwd(), 'uploads', 'checkup-preassessment');

@Injectable()
export class CheckupPreassessmentDocumentsService {
  private readonly logger = new Logger(CheckupPreassessmentDocumentsService.name);

  private sanitizePathSegment(value: string | null | undefined, fallback: string): string {
    const normalized = (value || fallback)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      .toLowerCase();
    return normalized || fallback;
  }

  private buildArchiveName(clientName: string | null | undefined): string {
    const normalized = this.sanitizePathSegment(clientName, 'cliente');
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const date = `${dd}${mm}${yyyy}`;
    return `${normalized}_${date}.zip`;
  }

  private async resolveStructureMap(clientId: string) {
    const sublicense = await this.sublicenseRepository.findOne({
      where: { clientId, attiva: true },
    });
    if (!sublicense) {
      return new Map<string, { macroLabel: string; sectionTitle: string }>();
    }

    const license = await this.licenseRepository.findOne({
      where: { id: sublicense.licenseId },
    });
    const modelId = sublicense.modelId || license?.modelId || null;
    if (!modelId) {
      return new Map<string, { macroLabel: string; sectionTitle: string }>();
    }

    const structure = await this.questionManagementService.getCompleteStructure(modelId);
    const map = new Map<string, { macroLabel: string; sectionTitle: string }>();
    structure.forEach((macro) => {
      const macroLabel = this.sanitizePathSegment(macro.label, 'macroarea');
      (macro.sections || []).forEach((section) => {
        map.set(section.code, {
          macroLabel,
          sectionTitle: this.sanitizePathSegment(section.title, 'sezione'),
        });
      });
    });
    return map;
  }

  constructor(
    @InjectRepository(CheckupPreassessmentDocument)
    private documentRepository: Repository<CheckupPreassessmentDocument>,
    @InjectRepository(CheckupSublicense)
    private sublicenseRepository: Repository<CheckupSublicense>,
    @InjectRepository(CheckupLicense)
    private licenseRepository: Repository<CheckupLicense>,
    private preassessmentService: CheckupPreassessmentService,
    private questionManagementService: QuestionManagementService,
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

  private async buildZipArchive(preassessmentId: string, user: CheckupCurrentUserData) {
    const { client } = await this.preassessmentService.getPreassessmentForDocuments(preassessmentId, user);
    const structureMap = await this.resolveStructureMap(client.id);
    const documents = await this.documentRepository.find({
      where: { preassessmentId, attivo: true },
      order: { createdAt: 'ASC' },
    });

    if (documents.length === 0) {
      throw new NotFoundException('Nessun documento disponibile da scaricare');
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const usedNames = new Set<string>();

    documents.forEach((doc) => {
      this.assertSafePath(doc.percorsoFile);
      if (!fs.existsSync(doc.percorsoFile)) return;

      const original = path.basename(doc.nomeOriginale || doc.nome || 'documento');
      const ext = path.extname(original);
      const base = ext ? original.slice(0, -ext.length) : original;
      let candidate = original;
      let counter = 2;

      while (usedNames.has(candidate)) {
        candidate = `${base} (${counter})${ext}`;
        counter += 1;
      }

      usedNames.add(candidate);
      const location = structureMap.get(doc.sectionId || '');
      const macroFolder = location?.macroLabel || 'documenti_senza_macroarea';
      const sectionFolder = location?.sectionTitle || 'documenti_senza_sezione';
      archive.file(doc.percorsoFile, { name: `${macroFolder}/${sectionFolder}/${candidate}` });
    });

    return {
      archive,
      clientId: client.id,
      filename: this.buildArchiveName(client.ragioneSociale || client.nome),
    };
  }

  async getZipPreview(preassessmentId: string, user: CheckupCurrentUserData): Promise<{ clientId: string; filename: string }> {
    const { clientId, filename } = await this.buildZipArchive(preassessmentId, user);
    return { clientId, filename };
  }

  async createZipStream(
    preassessmentId: string,
    user: CheckupCurrentUserData,
  ): Promise<{ archive: archiver.Archiver; filename: string }> {
    const { archive, filename } = await this.buildZipArchive(preassessmentId, user);
    return { archive, filename };
  }

  async createZipBuffer(preassessmentId: string, user: CheckupCurrentUserData): Promise<{ buffer: Buffer; filename: string; clientId: string }> {
    const { archive, filename, clientId } = await this.buildZipArchive(preassessmentId, user);
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve({ buffer: Buffer.concat(chunks), filename, clientId }));
      archive.on('error', reject);
      archive.pipe(stream);
      void archive.finalize();
    });
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
