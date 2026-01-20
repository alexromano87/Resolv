import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PianoAmmortamentoService } from './piano-ammortamento.service';
import { CreatePianoAmmortamentoDto } from './dto/create-piano-ammortamento.dto';
import { UpdateRataDto } from './dto/update-rata.dto';
import { ChiudiPianoDto } from './dto/chiudi-piano.dto';
import { InserisciCapitaleDto } from './dto/inserisci-capitale.dto';
import { RegistraPagamentoRataDto } from './dto/registra-pagamento-rata.dto';
import type { Response, Express } from 'express';
import { Res } from '@nestjs/common';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@Controller('piani-ammortamento')
@UseGuards(JwtAuthGuard)
export class PianoAmmortamentoController {
  constructor(private readonly pianoService: PianoAmmortamentoService) {}

  /**
   * Crea un piano di ammortamento per una pratica
   */
  @Post()
  async creaPiano(@Body() dto: CreatePianoAmmortamentoDto) {
    return await this.pianoService.creaPianoAmmortamento(dto);
  }

  /**
   * Ottieni il piano di ammortamento di una pratica
   */
  @Get('pratica/:praticaId')
  async getPianoByPratica(@Param('praticaId') praticaId: string) {
    return await this.pianoService.getPianoByPratica(praticaId);
  }

  /**
   * Ottieni statistiche del piano di ammortamento
   */
  @Get(':pianoId/statistiche')
  async getStatistiche(@Param('pianoId') pianoId: string) {
    return await this.pianoService.getStatistichePiano(pianoId);
  }

  /**
   * Aggiorna una rata (es. segnarla come pagata)
   */
  @Patch('rata/:rataId')
  async updateRata(@Param('rataId') rataId: string, @Body() dto: UpdateRataDto) {
    return await this.pianoService.updateRata(rataId, dto);
  }

  /**
   * Chiudi il piano con esito positivo o negativo
   */
  @Post(':pianoId/chiudi')
  async chiudiPiano(@Param('pianoId') pianoId: string, @Body() dto: ChiudiPianoDto) {
    return await this.pianoService.chiudiPiano(pianoId, dto);
  }

  /**
   * Riapri un piano chiuso
   */
  @Post(':pianoId/riapri')
  async riapriPiano(@Param('pianoId') pianoId: string) {
    return await this.pianoService.riapriPiano(pianoId);
  }

  /**
   * Inserisci l'importo recuperato nei movimenti finanziari
   */
  @Post(':pianoId/inserisci-capitale')
  async inserisciCapitale(@Param('pianoId') pianoId: string, @Body() dto: InserisciCapitaleDto) {
    return await this.pianoService.inserisciCapitale(pianoId, dto);
  }

  /**
   * Scarica il report del piano di ammortamento
   */
  @Get(':pianoId/report')
  async downloadReport(@Param('pianoId') pianoId: string, @Res() res: Response) {
    const buffer = await this.pianoService.generaReportPiano(pianoId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=piano-ammortamento-${pianoId}.pdf`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  /**
   * Registra il pagamento di una rata con caricamento della ricevuta
   */
  @Post('rata/:rataId/registra-pagamento')
  @UseInterceptors(
    FileInterceptor('ricevuta', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = process.env.UPLOAD_DIR || './uploads';
          const ricevuteDir = path.join(uploadDir, 'ricevute-rate');

          if (!fs.existsSync(ricevuteDir)) {
            fs.mkdirSync(ricevuteDir, { recursive: true });
          }

          cb(null, ricevuteDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
          const ext = path.extname(file.originalname);
          cb(null, `ricevuta-${req.params.rataId}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Formato file non supportato. Usa JPG, PNG, GIF o PDF'), false);
        }
      },
    }),
  )
  async registraPagamento(
    @Param('rataId') rataId: string,
    @Body() dto: RegistraPagamentoRataDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.pianoService.registraPagamentoRata(rataId, dto, file);
  }

  /**
   * Storna il pagamento di una rata
   */
  @Post('rata/:rataId/storna-pagamento')
  async stornaPagamento(@Param('rataId') rataId: string) {
    return await this.pianoService.stornaPagamentoRata(rataId);
  }

  /**
   * Scarica la ricevuta di pagamento di una rata
   */
  @Get('rata/:rataId/ricevuta')
  async downloadRicevuta(@Param('rataId') rataId: string, @Res() res: Response) {
    const { filePath, filename } = await this.pianoService.getRicevutaPath(rataId);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Ricevuta non trovata');
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': stat.size,
    });

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  /**
   * Elimina un piano e tutte le sue rate
   */
  @Delete(':pianoId')
  async deletePiano(@Param('pianoId') pianoId: string) {
    await this.pianoService.deletePiano(pianoId);
    return { message: 'Piano di ammortamento eliminato con successo' };
  }
}
