// apps/backend/src/utilita/utilita.controller.ts
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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import type { Express } from 'express';
import { UtilitaService } from './utilita.service';
import { CreateRisorsaUtilitaDto } from './dto/create-risorsa-utilita.dto';
import { UpdateRisorsaUtilitaDto } from './dto/update-risorsa-utilita.dto';
import { RisorsaUtilita } from './risorsa-utilita.entity';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { RateLimit } from '../common/rate-limit.decorator';

const MAX_UPLOAD_MB = Number(process.env.UPLOAD_UTILITA_MAX_MB ?? 100);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Multer configuration for file upload
const storage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'utilita');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `utilita-${uniqueSuffix}${ext}`);
  },
});

@Controller('utilita')
@UseGuards(JwtAuthGuard)
export class UtilitaController {
  constructor(private readonly utilitaService: UtilitaService) {}

  @Post('upload')
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
  @UseInterceptors(FileInterceptor('file', { storage, limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async uploadFile(
    @CurrentUser() user: CurrentUserData,
    @UploadedFile() file: Express.Multer.File,
    @Body('titolo') titolo?: string,
    @Body('descrizione') descrizione?: string,
    @Body('tipo') tipo?: string,
    @Body('caricatoDa') caricatoDa?: string,
  ): Promise<RisorsaUtilita> {
    const ext = path.extname(file.originalname);

    const createDto: CreateRisorsaUtilitaDto = {
      titolo: titolo || file.originalname,
      descrizione,
      tipo: (tipo as any) || 'altra_risorsa',
      percorsoFile: file.path,
      nomeOriginale: file.originalname,
      estensione: ext,
      dimensione: file.size,
      caricatoDa: caricatoDa || `${user.nome} ${user.cognome}`.trim(),
    };

    // Auto-assegna studioId se l'utente non è admin
    if (user.ruolo !== 'admin' && user.studioId) {
      createDto.studioId = user.studioId;
    }

    return await this.utilitaService.create(createDto);
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() createDto: CreateRisorsaUtilitaDto,
  ): Promise<RisorsaUtilita> {
    // Auto-assegna studioId se l'utente non è admin
    if (user.ruolo !== 'admin' && user.studioId) {
      createDto.studioId = user.studioId;
    }

    if (!createDto.caricatoDa) {
      createDto.caricatoDa = `${user.nome} ${user.cognome}`.trim();
    }

    return await this.utilitaService.create(createDto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<RisorsaUtilita[]> {
    const studioId = user.ruolo === 'admin' ? undefined : user.studioId || undefined;
    return this.utilitaService.findAll(studioId, includeInactive === 'true');
  }

  @Get('tipo/:tipo')
  async findByTipo(
    @CurrentUser() user: CurrentUserData,
    @Param('tipo') tipo: string,
  ): Promise<RisorsaUtilita[]> {
    const studioId = user.ruolo === 'admin' ? undefined : user.studioId || undefined;
    return this.utilitaService.findByTipo(tipo, studioId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<RisorsaUtilita> {
    return this.utilitaService.findOne(id);
  }

  @Get(':id/download')
  @RateLimit({ limit: 60, windowMs: 10 * 60 * 1000 })
  async downloadFile(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, risorsa } = await this.utilitaService.getFileStream(id);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${risorsa.nomeOriginale || 'download'}"`,
    });

    return new StreamableFile(stream);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRisorsaUtilitaDto,
  ): Promise<RisorsaUtilita> {
    return this.utilitaService.update(id, updateDto);
  }

  @Delete(':id')
  @RateLimit({ limit: 20, windowMs: 10 * 60 * 1000 })
  async remove(@Param('id') id: string): Promise<void> {
    return this.utilitaService.remove(id);
  }
}
