import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { CheckupPreassessmentDocument, CheckupPreassessmentDocumentType } from './checkup-preassessment-document.entity';
import { CheckupPreassessmentService } from './checkup-preassessment.service';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

const unlinkAsync = promisify(fs.unlink);

@Injectable()
export class CheckupPreassessmentDocumentsService {
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

  private canEdit(preassessment: { clientId: string; studioCanEdit: boolean }, user: CheckupCurrentUserData) {
    if (user.clientId && user.clientId === preassessment.clientId) return true;
    if (user.ruolo !== 'cliente' && preassessment.studioCanEdit) return true;
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
    const { preassessment } = await this.preassessmentService.getPreassessmentForDocuments(preassessmentId, user);
    if (!this.canEdit(preassessment, user)) {
      throw new ForbiddenException('Modifiche non autorizzate');
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
      await unlinkAsync(doc.percorsoFile);
    } catch {
      // ignore
    }
  }
}
