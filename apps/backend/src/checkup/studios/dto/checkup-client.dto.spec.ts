import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCheckupClientDto } from './create-checkup-client.dto';
import { UpdateCheckupClientDto } from './update-checkup-client.dto';

describe('Checkup Client DTOs', () => {
  describe('CreateCheckupClientDto', () => {
    it('accepts a client with ragione sociale only', async () => {
      const dto = plainToClass(CreateCheckupClientDto, {
        ragioneSociale: 'Acme Srl',
        sublicenseId: 'sub-1',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('accepts a client with nome only', async () => {
      const dto = plainToClass(CreateCheckupClientDto, {
        nome: 'Mario Rossi',
        sublicenseId: 'sub-1',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects a client when both nome and ragione sociale are missing', async () => {
      const dto = plainToClass(CreateCheckupClientDto, {
        sublicenseId: 'sub-1',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'nome')).toBe(true);
    });
  });

  describe('UpdateCheckupClientDto', () => {
    it('accepts clearing nome when ragione sociale is present', async () => {
      const dto = plainToClass(UpdateCheckupClientDto, {
        nome: '',
        ragioneSociale: 'Acme Srl',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

});
