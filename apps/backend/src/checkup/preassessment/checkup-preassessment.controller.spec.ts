import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CheckupPreassessmentController } from './checkup-preassessment.controller';
import { CheckupPreassessmentService } from './checkup-preassessment.service';
import { CheckupPreassessmentPresenceService } from './checkup-preassessment-presence.service';
import { CheckupPreassessmentReportsService } from './checkup-preassessment-reports.service';
import { CheckupPreassessmentExportJobsService } from './checkup-preassessment-export-jobs.service';
import { CheckupPreassessmentExcelExportService } from './checkup-preassessment-excel-export.service';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupStaffGuard } from '../auth/checkup-staff.guard';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

// ── Mock factories ────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<CheckupCurrentUserData> = {}): CheckupCurrentUserData => ({
  id: 'user-1',
  email: 'staff@studio.it',
  nome: 'Admin',
  cognome: 'Studio',
  ruolo: 'admin_studio',
  studioId: 'studio-1',
  clientId: undefined,
  ...overrides,
} as CheckupCurrentUserData);

const makeClienteUser = (): CheckupCurrentUserData =>
  makeUser({ ruolo: 'cliente', clientId: 'client-1', studioId: undefined });

const makePreassessment = (overrides = {}) => ({
  id: 'pa-1',
  clientId: 'client-1',
  status: 'in_progress',
  version: 1,
  ...overrides,
});

// ── Guard stubs (allow everything) ───────────────────────────────────────────

const alwaysAllow = { canActivate: () => true };

// ── Test suite ────────────────────────────────────────────────────────────────

describe('CheckupPreassessmentController', () => {
  let controller: CheckupPreassessmentController;

  let preassessmentService: {
    getOrCreate: jest.Mock;
    update: jest.Mock;
    complete: jest.Mock;
    finalValidate: jest.Mock;
    reopenFinalValidation: jest.Mock;
    listClients: jest.Mock;
    getClient: jest.Mock;
    updateClient: jest.Mock;
    createNewVersion: jest.Mock;
    getHistory: jest.Mock;
    getPreassessmentForReport: jest.Mock;
    renderHtmlToPdf: jest.Mock;
  };

  let presenceService: {
    getPresence: jest.Mock;
    getOnline: jest.Mock;
    setPresenceActive: jest.Mock;
    setPresenceInactive: jest.Mock;
  };

  let reportsService: {
    save: jest.Mock;
    listByClient: jest.Mock;
    getPdf: jest.Mock;
  };

  let exportJobsService: {
    createPdfJob: jest.Mock;
    getJob: jest.Mock;
    getJobFile: jest.Mock;
  };

  let excelExportService: {
    generateExcel: jest.Mock;
  };

  beforeEach(async () => {
    preassessmentService = {
      getOrCreate: jest.fn().mockResolvedValue(makePreassessment()),
      update: jest.fn().mockResolvedValue(makePreassessment()),
      complete: jest.fn().mockResolvedValue(makePreassessment({ status: 'concluso' })),
      finalValidate: jest.fn().mockResolvedValue(makePreassessment({ status: 'concluso' })),
      reopenFinalValidation: jest.fn().mockResolvedValue(makePreassessment({ status: 'in_progress', finalValidation: null })),
      listClients: jest.fn().mockResolvedValue([]),
      getClient: jest.fn().mockResolvedValue({ client: {}, preassessment: makePreassessment() }),
      updateClient: jest.fn().mockResolvedValue(makePreassessment()),
      createNewVersion: jest.fn().mockResolvedValue(makePreassessment({ version: 2 })),
      getHistory: jest.fn().mockResolvedValue([]),
      getPreassessmentForReport: jest.fn().mockResolvedValue({ preassessment: makePreassessment(), client: { id: 'client-1' } }),
      renderHtmlToPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF')),
    };

    presenceService = {
      getPresence: jest.fn().mockResolvedValue({ fields: [] }),
      getOnline: jest.fn().mockResolvedValue({ preassessmentIds: [] }),
      setPresenceActive: jest.fn().mockResolvedValue({ ok: true }),
      setPresenceInactive: jest.fn().mockResolvedValue({ ok: true }),
    };

    reportsService = {
      save: jest.fn().mockResolvedValue({ id: 'report-1' }),
      listByClient: jest.fn().mockResolvedValue([]),
      getPdf: jest.fn().mockResolvedValue({ pdf: Buffer.from('%PDF'), filename: 'report.pdf', clientId: 'client-1' }),
    };

    exportJobsService = {
      createPdfJob: jest.fn().mockResolvedValue({ jobId: 'job-1' }),
      getJob: jest.fn().mockResolvedValue({ status: 'pending' }),
      getJobFile: jest.fn().mockResolvedValue({ path: '/tmp/file.pdf', filename: 'export.pdf', mimeType: 'application/pdf' }),
    };

    excelExportService = {
      generateExcel: jest.fn().mockResolvedValue(Buffer.from('excel')),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckupPreassessmentController],
      providers: [
        { provide: CheckupPreassessmentService, useValue: preassessmentService },
        { provide: CheckupPreassessmentPresenceService, useValue: presenceService },
        { provide: CheckupPreassessmentReportsService, useValue: reportsService },
        { provide: CheckupPreassessmentExportJobsService, useValue: exportJobsService },
        { provide: CheckupPreassessmentExcelExportService, useValue: excelExportService },
      ],
    })
      .overrideGuard(CheckupJwtAuthGuard).useValue(alwaysAllow)
      .overrideGuard(CheckupStaffGuard).useValue(alwaysAllow)
      .compile();

    controller = module.get(CheckupPreassessmentController);
  });

  afterEach(() => jest.clearAllMocks());

  // ── GET / ──────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('delega a preassessmentService.getOrCreate', async () => {
      const user = makeClienteUser();
      const result = await controller.get(user);
      expect(preassessmentService.getOrCreate).toHaveBeenCalledWith(user);
      expect(result).toMatchObject({ id: 'pa-1' });
    });
  });

  // ── PUT / ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('delega a preassessmentService.update con il DTO', async () => {
      const user = makeClienteUser();
      const dto = { data: { field_a: 'value' } };
      await controller.update(user, dto as any);
      expect(preassessmentService.update).toHaveBeenCalledWith(user, dto);
    });
  });

  // ── POST /complete ─────────────────────────────────────────────────────────

  describe('complete()', () => {
    it('delega a preassessmentService.complete', async () => {
      const user = makeClienteUser();
      const result = await controller.complete(user);
      expect(preassessmentService.complete).toHaveBeenCalledWith(user);
      expect(result).toMatchObject({ status: 'concluso' });
    });
  });

  // ── POST /final-validate ───────────────────────────────────────────────────

  describe('finalValidate()', () => {
    it('delega a preassessmentService.finalValidate', async () => {
      const user = makeClienteUser();
      await controller.finalValidate(user);
      expect(preassessmentService.finalValidate).toHaveBeenCalledWith(user);
    });
  });

  describe('reopenFinalValidation()', () => {
    it('delega a preassessmentService.reopenFinalValidation', async () => {
      const user = makeClienteUser();
      await controller.reopenFinalValidation(user);
      expect(preassessmentService.reopenFinalValidation).toHaveBeenCalledWith(user);
    });
  });

  // ── GET /clients ───────────────────────────────────────────────────────────

  describe('listClients()', () => {
    it('delega a preassessmentService.listClients', async () => {
      const user = makeUser();
      await controller.listClients(user);
      expect(preassessmentService.listClients).toHaveBeenCalledWith(user);
    });
  });

  // ── GET /clients/:clientId ─────────────────────────────────────────────────

  describe('getClient()', () => {
    it('delega a preassessmentService.getClient con il clientId', async () => {
      const user = makeUser();
      await controller.getClient('client-42', user);
      expect(preassessmentService.getClient).toHaveBeenCalledWith('client-42', user);
    });
  });

  // ── PUT /clients/:clientId ─────────────────────────────────────────────────

  describe('updateClient()', () => {
    it('delega a preassessmentService.updateClient', async () => {
      const user = makeUser();
      const dto = { notes: { key: 'val' } };
      await controller.updateClient('client-42', user, dto as any);
      expect(preassessmentService.updateClient).toHaveBeenCalledWith('client-42', dto, user);
    });
  });

  // ── POST /clients/:clientId/new-version ───────────────────────────────────

  describe('createNewVersion()', () => {
    it('delega a preassessmentService.createNewVersion', async () => {
      const user = makeUser();
      const result = await controller.createNewVersion('client-42', user);
      expect(preassessmentService.createNewVersion).toHaveBeenCalledWith('client-42', user);
      expect(result).toMatchObject({ version: 2 });
    });
  });

  // ── GET /clients/:clientId/history ────────────────────────────────────────

  describe('getHistory()', () => {
    it('delega a preassessmentService.getHistory', async () => {
      const user = makeUser();
      await controller.getHistory('client-42', user);
      expect(preassessmentService.getHistory).toHaveBeenCalledWith('client-42', user);
    });
  });

  // ── POST /pdf/jobs ────────────────────────────────────────────────────────

  describe('createPdfJob()', () => {
    it('delega a exportJobsService.createPdfJob', async () => {
      const user = makeClienteUser();
      const html = '<html>test</html>';
      const result = await controller.createPdfJob(html, user);
      expect(exportJobsService.createPdfJob).toHaveBeenCalledWith(html, user);
      expect(result).toMatchObject({ jobId: 'job-1' });
    });
  });

  // ── GET /export-jobs/:jobId ───────────────────────────────────────────────

  describe('getExportJob()', () => {
    it('delega a exportJobsService.getJob', async () => {
      const user = makeClienteUser();
      await controller.getExportJob('job-99', user);
      expect(exportJobsService.getJob).toHaveBeenCalledWith('job-99', user);
    });
  });

  // ── POST /:preassessmentId/report/salva ───────────────────────────────────

  describe('saveReport()', () => {
    it('lancia BadRequestException se html è mancante', async () => {
      const user = makeUser();
      await expect(controller.saveReport('pa-1', user, '')).rejects.toThrow(BadRequestException);
      await expect(controller.saveReport('pa-1', user, undefined as any)).rejects.toThrow(BadRequestException);
    });

    it('salva il report e restituisce il record', async () => {
      const user = makeUser();
      const result = await controller.saveReport('pa-1', user, '<html>report</html>');
      expect(preassessmentService.getPreassessmentForReport).toHaveBeenCalledWith('pa-1', user);
      expect(preassessmentService.renderHtmlToPdf).toHaveBeenCalled();
      expect(reportsService.save).toHaveBeenCalled();
      expect(result).toMatchObject({ id: 'report-1' });
    });
  });

  // ── GET /clients/:clientId/reports ────────────────────────────────────────

  describe('listReports()', () => {
    it('verifica accesso e delega a reportsService.listByClient', async () => {
      const user = makeUser();
      await controller.listReports('client-42', user);
      expect(preassessmentService.getClient).toHaveBeenCalledWith('client-42', user);
      expect(reportsService.listByClient).toHaveBeenCalledWith('client-42');
    });
  });

  // ── Presence endpoints ────────────────────────────────────────────────────

  describe('getPresence()', () => {
    it('delega a presenceService.getPresence', async () => {
      const user = makeClienteUser();
      const result = await controller.getPresence('pa-1', user);
      expect(presenceService.getPresence).toHaveBeenCalledWith('pa-1', user);
      expect(result).toEqual({ fields: [] });
    });
  });

  describe('getOnline()', () => {
    it('delega a presenceService.getOnline', async () => {
      const user = makeUser();
      const result = await controller.getOnline(user);
      expect(presenceService.getOnline).toHaveBeenCalledWith(user);
      expect(result).toEqual({ preassessmentIds: [] });
    });
  });

  describe('setPresenceActive()', () => {
    it('delega a presenceService.setPresenceActive', async () => {
      const user = makeClienteUser();
      const result = await controller.setPresenceActive('pa-1', user, 'field-1');
      expect(presenceService.setPresenceActive).toHaveBeenCalledWith('pa-1', 'field-1', user);
      expect(result).toEqual({ ok: true });
    });

    it('lancia BadRequestException se fieldId è mancante', () => {
      const user = makeClienteUser();
      expect(() => controller.setPresenceActive('pa-1', user, '')).toThrow(BadRequestException);
      expect(() => controller.setPresenceActive('pa-1', user, undefined as any)).toThrow(BadRequestException);
    });
  });

  describe('setPresenceInactive()', () => {
    it('delega a presenceService.setPresenceInactive', async () => {
      const user = makeClienteUser();
      const result = await controller.setPresenceInactive('pa-1', user, 'field-1');
      expect(presenceService.setPresenceInactive).toHaveBeenCalledWith('pa-1', 'field-1', user);
      expect(result).toEqual({ ok: true });
    });

    it('lancia BadRequestException se fieldId è mancante', () => {
      const user = makeClienteUser();
      expect(() => controller.setPresenceInactive('pa-1', user, '')).toThrow(BadRequestException);
    });
  });
});
