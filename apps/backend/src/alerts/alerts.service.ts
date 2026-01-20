// apps/backend/src/alerts/alerts.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert, MessaggioAlert, type AlertStato } from './alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { AddMessaggioDto } from './dto/add-messaggio.dto';
import { v4 as uuidv4 } from 'uuid';
import { Pratica } from '../pratiche/pratica.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { EmailService } from '../notifications/email.service';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { normalizePagination, type PaginationOptions } from '../common/pagination';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private alertRepository: Repository<Alert>,
    @InjectRepository(Pratica)
    private praticaRepository: Repository<Pratica>,
    @InjectRepository(Avvocato)
    private avvocatiRepository: Repository<Avvocato>,
    private readonly emailService: EmailService,
  ) {}

  async create(createAlertDto: CreateAlertDto, creatoDa?: string): Promise<Alert> {
    const alert = this.alertRepository.create({
      ...createAlertDto,
      giorniAnticipo: createAlertDto.giorniAnticipo ?? 3,
      clienteCanClose: createAlertDto.clienteCanClose ?? false,
      messaggi: [],
      creatoDa: creatoDa || null,
    });
    const saved = await this.alertRepository.save(alert);
    await this.sendAlertEmail(saved);
    return saved;
  }

  async findAll(
    includeInactive = false,
    studioId?: string,
    pagination?: PaginationOptions,
  ): Promise<Alert[]> {
    const query = this.alertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore')
      .orderBy('alert.dataScadenza', 'ASC');

    if (!includeInactive) {
      query.andWhere('alert.attivo = :attivo', { attivo: true });
    }

    // Se studioId è definito, filtra per studio
    if (studioId !== undefined) {
      query.andWhere('alert.studioId = :studioId', { studioId });
    }

    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  async findAllForUser(
    user: CurrentUserData,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Alert[]> {
    const query = this.alertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore')
      .orderBy('alert.dataScadenza', 'ASC');

    if (!includeInactive) {
      query.andWhere('alert.attivo = :attivo', { attivo: true });
    }

    await this.applyAccessFilter(query, user);
    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  async findAllByPratica(
    praticaId: string,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Alert[]> {
    const query = this.alertRepository
      .createQueryBuilder('alert')
      .where('alert.praticaId = :praticaId', { praticaId })
      .leftJoinAndSelect('alert.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore')
      .orderBy('alert.dataScadenza', 'ASC');

    if (!includeInactive) {
      query.andWhere('alert.attivo = :attivo', { attivo: true });
    }

    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  async findAllByPraticaForUser(
    praticaId: string,
    user: CurrentUserData,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Alert[]> {
    const query = this.alertRepository
      .createQueryBuilder('alert')
      .where('alert.praticaId = :praticaId', { praticaId })
      .leftJoinAndSelect('alert.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore')
      .orderBy('alert.dataScadenza', 'ASC');

    if (!includeInactive) {
      query.andWhere('alert.attivo = :attivo', { attivo: true });
    }

    await this.applyAccessFilter(query, user);
    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  async findAllByStato(
    stato: 'in_gestione' | 'chiuso',
    includeInactive = false,
    studioId?: string,
    pagination?: PaginationOptions,
  ): Promise<Alert[]> {
    const query = this.alertRepository
      .createQueryBuilder('alert')
      .where('alert.stato = :stato', { stato })
      .leftJoinAndSelect('alert.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore')
      .orderBy('alert.dataScadenza', 'ASC');

    if (!includeInactive) {
      query.andWhere('alert.attivo = :attivo', { attivo: true });
    }

    // Se studioId è definito, filtra per studio
    if (studioId !== undefined) {
      query.andWhere('alert.studioId = :studioId', { studioId });
    }

    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  async findAllByStatoForUser(
    stato: 'in_gestione' | 'chiuso',
    user: CurrentUserData,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Alert[]> {
    const query = this.alertRepository
      .createQueryBuilder('alert')
      .where('alert.stato = :stato', { stato })
      .leftJoinAndSelect('alert.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore')
      .orderBy('alert.dataScadenza', 'ASC');

    if (!includeInactive) {
      query.andWhere('alert.attivo = :attivo', { attivo: true });
    }

    await this.applyAccessFilter(query, user);
    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  async findOne(id: string): Promise<Alert> {
    const alert = await this.alertRepository.findOne({
      where: { id },
      relations: ['pratica', 'pratica.cliente', 'pratica.debitore'],
    });

    if (!alert) {
      throw new NotFoundException(`Alert con ID ${id} non trovato`);
    }

    return alert;
  }

  async findOneForUser(id: string, user: CurrentUserData): Promise<Alert> {
    const query = this.alertRepository
      .createQueryBuilder('alert')
      .where('alert.id = :id', { id })
      .leftJoinAndSelect('alert.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore');

    await this.applyAccessFilter(query, user);
    const alert = await query.getOne();
    if (!alert) {
      throw new NotFoundException(`Alert con ID ${id} non trovato`);
    }
    return alert;
  }

  async update(id: string, updateAlertDto: UpdateAlertDto, user?: CurrentUserData): Promise<Alert> {
    const alert = user ? await this.findOneForUser(id, user) : await this.findOne(id);

    if (
      updateAlertDto.stato &&
      user?.ruolo === 'cliente' &&
      !alert.clienteCanClose
    ) {
      throw new ForbiddenException('Solo lo studio legale può modificare lo stato degli alert');
    }

    if (updateAlertDto.stato && !this.isValidStatusTransition(alert.stato, updateAlertDto.stato)) {
      throw new BadRequestException(`Transizione stato non valida: ${alert.stato} -> ${updateAlertDto.stato}`);
    }

    // Se si sta chiudendo l'alert, imposta dataChiusura
    if (updateAlertDto.stato === 'chiuso' && alert.stato !== 'chiuso') {
      Object.assign(alert, updateAlertDto, { dataChiusura: new Date() });
    } else if (updateAlertDto.stato === 'in_gestione' && alert.stato === 'chiuso') {
      // Se si riapre l'alert, rimuovi dataChiusura
      Object.assign(alert, updateAlertDto, { dataChiusura: null });
    } else {
      Object.assign(alert, updateAlertDto);
    }

    return this.alertRepository.save(alert);
  }

  async deactivate(id: string, user?: CurrentUserData): Promise<Alert> {
    const alert = user ? await this.findOneForUser(id, user) : await this.findOne(id);
    alert.attivo = false;
    return this.alertRepository.save(alert);
  }

  async reactivate(id: string, user?: CurrentUserData): Promise<Alert> {
    const alert = user ? await this.findOneForUser(id, user) : await this.findOne(id);
    alert.attivo = true;
    return this.alertRepository.save(alert);
  }

  async remove(id: string, user?: CurrentUserData): Promise<void> {
    const alert = user ? await this.findOneForUser(id, user) : await this.findOne(id);
    await this.alertRepository.remove(alert);
  }

  async addMessaggio(id: string, addMessaggioDto: AddMessaggioDto, user?: CurrentUserData): Promise<Alert> {
    const alert = user ? await this.findOneForUser(id, user) : await this.findOne(id);

    const nuovoMessaggio: MessaggioAlert = {
      id: uuidv4(),
      autore: addMessaggioDto.autore,
      testo: addMessaggioDto.testo,
      dataInvio: new Date(),
    };

    alert.messaggi = [...(alert.messaggi || []), nuovoMessaggio];
    return this.alertRepository.save(alert);
  }

  async chiudiAlert(id: string): Promise<Alert> {
    return this.update(id, { stato: 'chiuso' });
  }

  async riapriAlert(id: string): Promise<Alert> {
    return this.update(id, { stato: 'in_gestione' });
  }

  private isValidStatusTransition(current: AlertStato, next: AlertStato): boolean {
    if (current === next) return true;
    const allowed: Record<AlertStato, AlertStato[]> = {
      in_gestione: ['chiuso'],
      chiuso: ['in_gestione'],
    };
    return allowed[current].includes(next);
  }

  private buildPraticaLabel(pratica: Pratica | null): string {
    if (!pratica) return 'Pratica';
    const cliente = pratica.cliente?.ragioneSociale || 'Cliente';
    const debitore =
      pratica.debitore?.ragioneSociale ||
      [pratica.debitore?.nome, pratica.debitore?.cognome].filter(Boolean).join(' ') ||
      'Debitore';
    return `${cliente} vs ${debitore}`;
  }

  private async sendAlertEmail(alert: Alert) {
    const pratica = await this.praticaRepository.findOne({
      where: { id: alert.praticaId },
      relations: ['avvocati', 'cliente', 'debitore'],
    });

    const recipients = Array.from(
      new Set(
        (pratica?.avvocati || [])
          .map((avvocato) => avvocato.email)
          .filter(Boolean),
      ),
    );

    if (recipients.length === 0) return;

    const praticaLabel = this.buildPraticaLabel(pratica || null);
    const subject = `Nuovo alert per ${praticaLabel}`;
    const text = [
      `È stato creato un nuovo alert.`,
      `Pratica: ${praticaLabel}`,
      `Titolo: ${alert.titolo}`,
      `Descrizione: ${alert.descrizione}`,
      `Scadenza: ${new Date(alert.dataScadenza).toLocaleDateString('it-IT')}`,
    ].join('\n');

    await this.emailService.sendEmail({
      to: recipients,
      subject,
      text,
    });
  }

  private async applyAccessFilter(
    query: ReturnType<Repository<Alert>['createQueryBuilder']>,
    user: CurrentUserData,
  ) {
    if (user.ruolo === 'admin') {
      return;
    }

    if (user.ruolo === 'cliente') {
      if (!user.clienteId) {
        query.andWhere('1 = 0');
        return;
      }
      query.andWhere('pratica.clienteId = :clienteId', { clienteId: user.clienteId });
      return;
    }

    if (user.ruolo === 'avvocato') {
      const canSeeAll = await this.canAvvocatoSeeAll(user);
      if (canSeeAll) {
        if (user.studioId) {
          query.andWhere('alert.studioId = :studioId', { studioId: user.studioId });
          return;
        }
        query.andWhere('1 = 0');
        return;
      }
      const email = user.email?.toLowerCase().trim();
      if (!email) {
        query.andWhere('1 = 0');
        return;
      }
      query
        .leftJoin('pratica.avvocati', 'avvocato_access')
        .andWhere('LOWER(avvocato_access.email) = :email', { email });
      return;
    }

    if (user.ruolo === 'collaboratore') {
      query
        .leftJoin('pratica.collaboratori', 'collaboratore_access')
        .andWhere('collaboratore_access.id = :userId', { userId: user.id });
      return;
    }

    if (!user.studioId) {
      query.andWhere('1 = 0');
      return;
    }

    query.andWhere('alert.studioId = :studioId', { studioId: user.studioId });
  }

  private async canAvvocatoSeeAll(user: CurrentUserData): Promise<boolean> {
    if (user.ruolo !== 'avvocato') return false;
    const email = user.email?.toLowerCase().trim();
    if (!email || !user.studioId) return false;
    const avvocato = await this.avvocatiRepository.findOne({
      where: { email, studioId: user.studioId },
    });
    return avvocato?.livelloAccessoPratiche === 'tutte';
  }
}
