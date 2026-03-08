import { CheckupStudiosService } from './checkup-studios.service';

describe('CheckupStudiosService', () => {
  const createRepository = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  });

  it('clears nome when ragione sociale remains populated', async () => {
    const studioRepository = createRepository();
    const clientRepository = createRepository();
    const licenseRepository = createRepository();
    const sublicenseRepository = createRepository();

    const service = new CheckupStudiosService(
      studioRepository as any,
      clientRepository as any,
      licenseRepository as any,
      sublicenseRepository as any,
    );

    const client = {
      id: 'client-1',
      nome: 'Cliente di Test',
      ragioneSociale: 'Cliente di Test Spa',
      partitaIva: null,
      codiceFiscale: null,
      indirizzo: null,
      citta: null,
      provincia: null,
      cap: null,
      paese: null,
      email: 'info@cliente.it',
      telefono: null,
      sitoWeb: null,
      logoUrl: null,
      note: null,
      attivo: true,
    };

    const sublicense = {
      id: 'sub-1',
      licenseId: 'license-1',
      numeroUtenze: 4,
      numeroSublicenza: 'SUB-001',
      tipo: 'standard',
      attiva: true,
      dataInizioValidita: '2026-01-01',
      dataScadenza: '2026-12-31',
    };

    jest.spyOn(service as any, 'getLicenseForAdmin').mockResolvedValue({ id: 'license-1' });
    clientRepository.findOne.mockResolvedValue(client);
    sublicenseRepository.findOne.mockResolvedValue(sublicense);
    clientRepository.save.mockImplementation(async (value) => value);

    const result = await service.updateClient(
      'client-1',
      { nome: '', ragioneSociale: 'Cliente di Test Spa' },
      { ruolo: 'admin_studio', studioId: 'studio-1' } as any,
    );

    expect(clientRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: null,
        ragioneSociale: 'Cliente di Test Spa',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        nome: null,
        ragioneSociale: 'Cliente di Test Spa',
      }),
    );
  });
});
