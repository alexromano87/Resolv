import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { CheckupDocument, CheckupDocumentType } from './checkup-document.entity';
import { CheckupQuestionnaire } from '../questionnaires/checkup-questionnaire.entity';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

const unlinkAsync = promisify(fs.unlink);
const UPLOAD_BASE = path.resolve(process.cwd(), 'uploads', 'checkup');

@Injectable()
export class CheckupDocumentsService {
  private readonly logger = new Logger(CheckupDocumentsService.name);

  private assertSafePath(percorsoFile: string): void {
    const resolved = path.resolve(percorsoFile);
    if (!resolved.startsWith(UPLOAD_BASE + path.sep) && resolved !== UPLOAD_BASE) {
      this.logger.error(`Path traversal attempt blocked. Resolved path outside upload dir.`);
      throw new InternalServerErrorException('Percorso file non valido');
    }
  }

  constructor(
    @InjectRepository(CheckupDocument)
    private documentRepository: Repository<CheckupDocument>,
    @InjectRepository(CheckupQuestionnaire)
    private questionnaireRepository: Repository<CheckupQuestionnaire>,
  ) {}

  private canAccess(questionnaire: CheckupQuestionnaire, user: CheckupCurrentUserData) {
    if (user.ruolo !== 'cliente') return true;
    if (questionnaire.clienteUserId === user.id) return true;
    if (user.clientId && questionnaire.cliente?.clientId === user.clientId) return true;
    return false;
  }

  private canEdit(questionnaire: CheckupQuestionnaire, user: CheckupCurrentUserData) {
    if (user.ruolo !== 'cliente') return false;
    if (questionnaire.clienteUserId === user.id) return true;
    if (user.clientId && questionnaire.cliente?.clientId === user.clientId) return true;
    return false;
  }

  private getDocumentType(ext: string): CheckupDocumentType {
    const extLower = ext.toLowerCase().replace('.', '');
    const mapping: Record<string, CheckupDocumentType> = {
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

  async upload(
    questionnaireId: string,
    file: Express.Multer.File,
    user: CheckupCurrentUserData,
    answerId?: string,
    sectionId?: string,
  ): Promise<CheckupDocument> {
    const questionnaire = await this.questionnaireRepository.findOne({
      where: { id: questionnaireId, attivo: true },
      relations: ['cliente'],
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionario non trovato');
    }

    // Solo il cliente assegnato (o dello stesso cliente) può caricare documenti
    if (!this.canEdit(questionnaire, user)) {
      throw new ForbiddenException('Solo il cliente assegnato può caricare documenti');
    }

    const ext = path.extname(file.originalname);

    const doc = this.documentRepository.create({
      questionnaireId,
      answerId: answerId || null,
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

  async findByQuestionnaire(
    questionnaireId: string,
    user: CheckupCurrentUserData,
    sectionId?: string,
    answerId?: string,
  ): Promise<CheckupDocument[]> {
    const questionnaire = await this.questionnaireRepository.findOne({
      where: { id: questionnaireId, attivo: true },
      relations: ['cliente'],
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionario non trovato');
    }

    if (!this.canAccess(questionnaire, user)) {
      throw new ForbiddenException('Non autorizzato');
    }

    const qb = this.documentRepository
      .createQueryBuilder('d')
      .where('d.questionnaireId = :qId', { qId: questionnaireId })
      .andWhere('d.attivo = :attivo', { attivo: true });

    if (sectionId) {
      qb.andWhere('d.sectionId = :sectionId', { sectionId });
    }

    if (answerId) {
      qb.andWhere('d.answerId = :answerId', { answerId });
    }

    qb.orderBy('d.createdAt', 'DESC');

    return qb.getMany();
  }

  async getFileStream(
    id: string,
    user: CheckupCurrentUserData,
  ): Promise<{ stream: fs.ReadStream; document: CheckupDocument }> {
    const doc = await this.documentRepository.findOne({
      where: { id, attivo: true },
      relations: ['questionnaire', 'questionnaire.cliente'],
    });

    if (!doc) {
      throw new NotFoundException('Documento non trovato');
    }

    if (!this.canAccess(doc.questionnaire, user)) {
      throw new ForbiddenException('Non autorizzato');
    }

    this.assertSafePath(doc.percorsoFile);
    const stream = fs.createReadStream(doc.percorsoFile);
    return { stream, document: doc };
  }

  async remove(id: string, user: CheckupCurrentUserData): Promise<void> {
    const doc = await this.documentRepository.findOne({
      where: { id, attivo: true },
      relations: ['questionnaire', 'questionnaire.cliente'],
    });

    if (!doc) {
      throw new NotFoundException('Documento non trovato');
    }

    // Solo il cliente assegnato (o dello stesso cliente) può eliminare documenti
    if (!this.canEdit(doc.questionnaire, user)) {
      throw new ForbiddenException('Solo il cliente assegnato può eliminare documenti');
    }

    doc.attivo = false;
    await this.documentRepository.save(doc);

    // Remove physical file
    try {
      this.assertSafePath(doc.percorsoFile);
      await unlinkAsync(doc.percorsoFile);
    } catch {
      // File may already be deleted, or path validation logged the issue
    }
  }
}
