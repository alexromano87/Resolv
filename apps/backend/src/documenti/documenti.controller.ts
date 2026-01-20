// apps/backend/src/documenti/documenti.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import type { Express } from 'express';
import { DocumentiService } from './documenti.service';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { Documento, TipoDocumento } from './documento.entity';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { PraticheService } from '../pratiche/pratiche.service';
import { CartelleService } from '../cartelle/cartelle.service';
import { RateLimit } from '../common/rate-limit.decorator';

// Utility function to determine document type from file extension
function getTipoDocumento(extension: string): TipoDocumento {
  const ext = extension.toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (['.doc', '.docx'].includes(ext)) return 'word';
  if (['.xls', '.xlsx'].includes(ext)) return 'excel';
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) return 'immagine';
  if (ext === '.csv') return 'csv';
  if (ext === '.xml') return 'xml';
  return 'altro';
}

const MAX_UPLOAD_MB = Number(process.env.UPLOAD_DOCUMENT_MAX_MB ?? 50);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Multer configuration for file upload
const storage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'documenti');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `documento-${uniqueSuffix}${ext}`);
  },
});

@Controller('documenti')
@UseGuards(JwtAuthGuard)
export class DocumentiController {
  constructor(
    private readonly documentiService: DocumentiService,
    private readonly praticheService: PraticheService,
    private readonly cartelleService: CartelleService,
  ) {}

  @Post('upload')
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
  @UseInterceptors(FileInterceptor('file', { storage, limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async uploadFile(
    @CurrentUser() user: CurrentUserData,
    @UploadedFile() file: Express.Multer.File,
    @Body('nome') nome?: string,
    @Body('descrizione') descrizione?: string,
    @Body('caricatoDa') caricatoDa?: string,
    @Body('praticaId') praticaId?: string,
    @Body('cartellaId') cartellaId?: string,
    @Body('tipologia') tipologia?: string,
  ): Promise<Documento> {
    const ext = path.extname(file.originalname);
    const tipo = getTipoDocumento(ext);

    // Se l'utente è un cliente, può caricare solo nella cartella "Cliente"
    if (user.ruolo === 'cliente' && cartellaId) {
      const cartella = await this.cartelleService.findOne(cartellaId);
      if (cartella.tipologia !== 'Cliente') {
        throw new ForbiddenException('I clienti possono caricare documenti solo nella cartella "Cliente"');
      }
    }

    const tipologiaDocumento = user.ruolo === 'cliente' ? 'Cliente' : tipologia;
    const caricatoDaLabel = caricatoDa || `${user.nome} ${user.cognome}`.trim() || user.email || undefined;

    const createDto: CreateDocumentoDto = {
      nome: nome || file.originalname,
      descrizione,
      percorsoFile: file.path,
      nomeOriginale: file.originalname,
      estensione: ext,
      tipo,
      tipologia: tipologiaDocumento as any,
      dimensione: file.size,
      caricatoDa: caricatoDaLabel,
      praticaId,
      cartellaId,
    };

    // Auto-assegna studioId se l'utente non è admin
    if (user.ruolo !== 'admin' && user.studioId) {
      createDto.studioId = user.studioId;
    }

    const saved = await this.documentiService.create(createDto, {
      uploaderRole: user.ruolo,
    });

    // Traccia l'evento nella pratica se il documento è associato a una pratica
    if (saved.praticaId) {
      const eseguitoDa = `${user.nome} ${user.cognome}`.trim();
      await this.praticheService.aggiungiEventoFaseCorrente(
        saved.praticaId,
        'documento_caricato',
        {
          id: saved.id,
          nome: saved.nome,
          tipo: saved.tipo,
        },
        eseguitoDa,
      );
    }

    return saved;
  }

  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<Documento[]> {
    return this.documentiService.findAllForUser(user, includeInactive === 'true', {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('pratica/:praticaId')
  async findByPratica(
    @CurrentUser() user: CurrentUserData,
    @Param('praticaId') praticaId: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<Documento[]> {
    await this.praticheService.findOneForUser(praticaId, user);
    return this.documentiService.findByPratica(
      praticaId,
      includeInactive === 'true',
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
    );
  }

  @Get('cartella/:cartellaId')
  async findByCartella(
    @CurrentUser() user: CurrentUserData,
    @Param('cartellaId') cartellaId: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<Documento[]> {
    const cartella = await this.cartelleService.findOne(cartellaId);
    if (cartella.praticaId) {
      await this.praticheService.findOneForUser(cartella.praticaId, user);
    } else if (user.ruolo !== 'admin' && cartella.studioId !== user.studioId) {
      throw new NotFoundException('Cartella non trovata');
    }
    return this.documentiService.findByCartella(
      cartellaId,
      includeInactive === 'true',
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
    );
  }

  @Get(':id')
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string): Promise<Documento> {
    await this.assertDocumentoAccess(id, user);
    return this.documentiService.findOne(id);
  }

  @Get(':id/download')
  @RateLimit({ limit: 60, windowMs: 10 * 60 * 1000 })
  async downloadFile(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    await this.assertDocumentoAccess(id, user);
    const { stream, documento } = await this.documentiService.getFileStream(id);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${documento.nomeOriginale}"`,
    });

    return new StreamableFile(stream);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateDto: UpdateDocumentoDto,
  ): Promise<Documento> {
    await this.assertDocumentoAccess(id, user);
    return this.documentiService.update(id, updateDto);
  }

  @Patch(':id/deactivate')
  async deactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string): Promise<Documento> {
    await this.assertDocumentoAccess(id, user);
    return this.documentiService.deactivate(id);
  }

  @Patch(':id/reactivate')
  async reactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string): Promise<Documento> {
    await this.assertDocumentoAccess(id, user);
    return this.documentiService.reactivate(id);
  }

  @Delete(':id')
  @RateLimit({ limit: 20, windowMs: 10 * 60 * 1000 })
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string): Promise<void> {
    await this.assertDocumentoAccess(id, user);

    // Ottieni i dettagli del documento prima di eliminarlo
    const documento = await this.documentiService.findOne(id);

    // Blocca l'eliminazione se l'utente è un cliente e il documento è nella cartella "Cliente"
    if (user.ruolo === 'cliente' && documento.cartellaId) {
      const cartella = await this.cartelleService.findOne(documento.cartellaId);
      if (cartella.tipologia === 'Cliente') {
        throw new ForbiddenException('I clienti non possono eliminare documenti dalla cartella "Cliente"');
      }
    }

    // Elimina il documento
    await this.documentiService.remove(id);

    // Registra l'eliminazione nello storico se il documento era associato a una pratica
    if (documento.praticaId) {
      const eseguitoDa = user ? `${user.nome} ${user.cognome}`.trim() : undefined;
      await this.praticheService.aggiungiEventoFaseCorrente(
        documento.praticaId,
        'documento_eliminato',
        {
          id: documento.id,
          nomeFile: documento.nomeOriginale,
          tipoDocumento: documento.tipo,
          cartellaId: documento.cartellaId,
        },
        eseguitoDa,
      );
    }
  }

  private async assertDocumentoAccess(id: string, user: CurrentUserData | null) {
    if (!user || user.ruolo === 'admin') return;
    const documento = await this.documentiService.findOne(id);
    if (documento.praticaId) {
      await this.praticheService.findOneForUser(documento.praticaId, user);
      return;
    }

    if (documento.studioId && documento.studioId === user.studioId) {
      return;
    }

    throw new NotFoundException('Documento non trovato');
  }
}
