import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { Ticket } from './ticket.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { Studio } from '../studi/studio.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { EmailService } from '../notifications/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AlertsService } from '../alerts/alerts.service';
import { CreateAlertDto } from '../alerts/dto/create-alert.dto';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

const mockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
});

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketRepo: jest.Mocked<Repository<Ticket>>;
  let praticaRepo: jest.Mocked<Repository<Pratica>>;
  let alertsService: jest.Mocked<AlertsService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getRepositoryToken(Ticket), useValue: mockRepository() },
        { provide: getRepositoryToken(Pratica), useValue: mockRepository() },
        { provide: getRepositoryToken(Studio), useValue: mockRepository() },
        { provide: getRepositoryToken(Avvocato), useValue: mockRepository() },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
        { provide: NotificationsService, useValue: { notifyTicketOpened: jest.fn() } },
        { provide: AlertsService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    ticketRepo = module.get(getRepositoryToken(Ticket));
    praticaRepo = module.get(getRepositoryToken(Pratica));
    alertsService = module.get<AlertsService>(AlertsService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    consoleErrorSpy.mockClear();
  });

  const baseTicketPayload = { oggetto: 'Oggetto', descrizione: 'Desc' } as Ticket;

  beforeEach(() => {
    ticketRepo.create.mockReturnValue(baseTicketPayload);
    ticketRepo.save.mockResolvedValue({ ...baseTicketPayload, id: 't1', praticaId: 'p1' } as Ticket);
  });

  it('genera un alert quando viene creato un ticket', async () => {
    alertsService.create.mockResolvedValue({ id: 'alert-1' } as any);

    await service.create({
      praticaId: 'p1',
      oggetto: baseTicketPayload.oggetto,
      descrizione: baseTicketPayload.descrizione,
      autore: 'Cliente',
    });

    expect(alertsService.create).toHaveBeenCalledWith(
      expect.objectContaining<CreateAlertDto>({
        praticaId: 'p1',
        titolo: expect.stringContaining('Ticket cliente'),
      }),
    );
    expect(ticketRepo.save).toHaveBeenCalledTimes(2);
  });

  it('salva alertId quando l\'alert viene creato con successo', async () => {
    alertsService.create.mockResolvedValue({ id: 'alert-2' } as any);

    await service.create({
      praticaId: 'p2',
      oggetto: 'Ogg',
      descrizione: 'Desc',
      autore: 'Cliente',
    });

    expect(ticketRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        alertId: 'alert-2',
      }),
    );
  });

  it('continua anche se la creazione dell\'alert fallisce', async () => {
    alertsService.create.mockRejectedValue(new Error('boom'));

    await service.create({
      praticaId: 'p3',
      oggetto: 'Ogg',
      descrizione: 'Desc',
      autore: 'Cliente',
    });

    expect(alertsService.create).toHaveBeenCalled();
    expect(ticketRepo.save).toHaveBeenCalled();
  });

  describe('createForUser', () => {
    const baseUser: CurrentUserData = {
      id: 'user-1',
      ruolo: 'cliente',
      email: 'cliente@example.com',
      clienteId: 'cliente-1',
    };

    const baseDto = {
      praticaId: 'pratica-1',
      oggetto: 'Richiesta assistenza',
      descrizione: 'Dettaglio problema',
      autore: 'Cliente',
    };

    it('rifiuta utenti non cliente', async () => {
      await expect(
        service.createForUser(
          { ...baseUser, ruolo: 'avvocato' },
          baseDto,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('richiede clienteId per il cliente', async () => {
      await expect(
        service.createForUser(
          { ...baseUser, clienteId: null },
          baseDto,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('richiede praticaId per aprire il ticket', async () => {
      await expect(
        service.createForUser(baseUser, { ...baseDto, praticaId: undefined }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('verifica che la pratica appartenga al cliente', async () => {
      praticaRepo.findOne.mockResolvedValue(null);

      await expect(service.createForUser(baseUser, baseDto)).rejects.toBeInstanceOf(ForbiddenException);

      praticaRepo.findOne.mockResolvedValue({
        id: 'pratica-1',
        clienteId: 'altro',
      } as Pratica);

      await expect(service.createForUser(baseUser, baseDto)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('salva il ticket associando lo studio e notifica', async () => {
      praticaRepo.findOne.mockResolvedValue({
        id: 'pratica-1',
        clienteId: baseUser.clienteId,
        studioId: 'studio-1',
      } as Pratica);
      ticketRepo.save.mockResolvedValue({ ...baseTicketPayload, id: 'ticket-2' } as Ticket);

      await service.createForUser(baseUser, baseDto);

      expect(ticketRepo.save).toHaveBeenCalled();
      expect(notificationsService.notifyTicketOpened).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ticket-2' } as Ticket),
      );
      expect(ticketRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          studioId: 'studio-1',
        }),
      );
    });
  });
});
