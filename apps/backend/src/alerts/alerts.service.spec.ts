import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { AlertsService } from './alerts.service';
import { Alert } from './alert.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { EmailService } from '../notifications/email.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';

const mockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
});

describe('AlertsService', () => {
  let service: AlertsService;
  let alertRepo: jest.Mocked<Repository<Alert>>;
  let praticaRepo: jest.Mocked<Repository<Pratica>>;
  let emailService: { sendEmail: jest.Mock };

  beforeEach(async () => {
    emailService = { sendEmail: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getRepositoryToken(Alert), useValue: mockRepository() },
        { provide: getRepositoryToken(Pratica), useValue: mockRepository() },
        { provide: getRepositoryToken(Avvocato), useValue: mockRepository() },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    alertRepo = module.get(getRepositoryToken(Alert));
    praticaRepo = module.get(getRepositoryToken(Pratica));
    alertRepo.save.mockImplementation(async (entity) => ({ ...entity } as Alert));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const baseAlertDto = {
    praticaId: 'p-1',
    titolo: 'Test',
    descrizione: 'Dettaglio',
    destinatario: 'studio' as const,
    dataScadenza: new Date().toISOString(),
  };

  describe('aggiornamento stato', () => {
    it('blocca la chiusura quando clienteCanClose è false', async () => {
      const mockAlert = {
        id: 'alert-1',
        stato: 'in_gestione',
        clienteCanClose: false,
      } as Alert;
      jest.spyOn(service as any, 'findOneForUser').mockResolvedValue(mockAlert);

      await expect(
        service.update('alert-1', { stato: 'chiuso' }, { ruolo: 'cliente' } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(alertRepo.save).not.toHaveBeenCalled();
    });

    it('permette la chiusura quando clienteCanClose è true', async () => {
      const mockAlert = {
        id: 'alert-2',
        stato: 'in_gestione',
        clienteCanClose: true,
      } as Alert;
      jest.spyOn(service as any, 'findOneForUser').mockResolvedValue(mockAlert);
      alertRepo.save.mockResolvedValue(mockAlert);

      const result = await service.update(
        'alert-2',
        { stato: 'chiuso' },
        { ruolo: 'cliente' } as any,
      );

      expect(alertRepo.save).toHaveBeenCalledWith(expect.objectContaining({ stato: 'chiuso' }));
      expect(result).toBe(mockAlert);
    });

    it('consente allo studio di chiudere anche quando clienteCanClose è false', async () => {
      const mockAlert = {
        id: 'alert-4',
        stato: 'in_gestione',
        clienteCanClose: false,
      } as Alert;
      jest.spyOn(service as any, 'findOneForUser').mockResolvedValue(mockAlert);
      alertRepo.save.mockResolvedValue(mockAlert);

      await service.update('alert-4', { stato: 'chiuso' }, { ruolo: 'studio' } as any);
      expect(alertRepo.save).toHaveBeenCalled();
    });
  });

  describe('creazione e notifiche', () => {
    it('blocca clienteCanClose a false durante la creazione', async () => {
      const payload = {
        ...baseAlertDto,
        giorniAnticipo: 3,
      };
      alertRepo.create.mockReturnValue({ ...payload, clienteCanClose: false } as Alert);
      alertRepo.save.mockResolvedValue({ ...payload, id: 'alert-3', clienteCanClose: false } as Alert);
      jest.spyOn(service as any, 'sendAlertEmail').mockResolvedValue(undefined);

      await service.create(payload as any);

      expect(alertRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clienteCanClose: false,
        }),
      );
    });

    it('invia email ai legali associati alla pratica', async () => {
      const payload = { ...baseAlertDto };
      alertRepo.create.mockReturnValue({ ...payload } as Alert);
      alertRepo.save.mockResolvedValue({ id: 'alert-5', ...payload } as Alert);
      praticaRepo.findOne.mockResolvedValue({
        avvocati: [
          { email: 'avv1@example.com' },
          { email: 'avv2@example.com' },
          { email: 'avv1@example.com' },
        ],
        cliente: { ragioneSociale: 'Studio Demo' },
        debitore: { nome: 'Mario', cognome: 'Rossi' },
      } as Pratica);

      await service.create(payload as any);

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['avv1@example.com', 'avv2@example.com'],
          subject: expect.stringContaining('Nuovo alert per'),
          text: expect.stringContaining('Pratica: Studio Demo vs Mario Rossi'),
        }),
      );
    });

    it('non invia email quando non ci sono destinatari', async () => {
      const payload = { ...baseAlertDto };
      alertRepo.create.mockReturnValue({ ...payload } as Alert);
      alertRepo.save.mockResolvedValue({ id: 'alert-6', ...payload } as Alert);
      praticaRepo.findOne.mockResolvedValue({
        avvocati: [],
        cliente: null,
        debitore: null,
      } as Pratica);

      await service.create(payload as any);

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('transizioni di stato', () => {
    it('assegna dataChiusura quando si chiude e la rimuove quando si riapre', async () => {
      const baseAlert = {
        id: 'alert-7',
        stato: 'in_gestione',
        clienteCanClose: true,
      } as Alert;
      const closedAlert = { ...baseAlert, stato: 'chiuso', dataChiusura: new Date() } as Alert;
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValueOnce(baseAlert).mockResolvedValueOnce(closedAlert);
      alertRepo.save.mockImplementation(async (entity) => ({ ...entity } as Alert));

      await service.update('alert-7', { stato: 'chiuso' });
      expect(alertRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          stato: 'chiuso',
          dataChiusura: expect.any(Date),
        }),
      );

      await service.update('alert-7', { stato: 'in_gestione' });
      expect(alertRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          stato: 'in_gestione',
          dataChiusura: null,
        }),
      );
    });
  });

  describe('attivazione e disattivazione', () => {
    it('gestisce deactivate e reactivate', async () => {
      const initialAlert = { id: 'alert-8', attivo: true } as Alert;
      const afterDeactivate = { ...initialAlert, attivo: false } as Alert;
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValueOnce(initialAlert).mockResolvedValueOnce(afterDeactivate);

      await service.deactivate('alert-8');
      expect(alertRepo.save).toHaveBeenCalledWith(expect.objectContaining({ attivo: false }));

      await service.reactivate('alert-8');
      expect(alertRepo.save).toHaveBeenCalledWith(expect.objectContaining({ attivo: true }));
      expect(alertRepo.save).toHaveBeenNthCalledWith(2, expect.objectContaining({ attivo: true }));
    });
  });
});
