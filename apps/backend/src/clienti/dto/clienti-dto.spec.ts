import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateClienteDto } from './create-cliente.dto';
import { UpdateClienteDto } from './update-cliente.dto';

describe('Clienti DTOs', () => {
  describe('CreateClienteDto', () => {
    it('should validate a valid cliente dto', async () => {
      const dto = plainToClass(CreateClienteDto, {
        ragioneSociale: 'Test SRL',
        partitaIva: '12345678901',
        email: 'test@example.com',
        studioId: '123e4567-e89b-12d3-a456-426614174000',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept optional fields', async () => {
      const dto = plainToClass(CreateClienteDto, {
        ragioneSociale: 'Test SRL',
        partitaIva: '12345678901',
        studioId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        telefono: '1234567890',
        pec: 'pec@example.com',
        codiceFiscale: 'ABCDEF12G34H567I',
        indirizzo: 'Via Test 1',
        citta: 'Milano',
        provincia: 'MI',
        cap: '20100',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow minimal cliente data', async () => {
      const dto = plainToClass(CreateClienteDto, {
        ragioneSociale: 'Minimal SRL',
        email: 'minimal@example.com',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('UpdateClienteDto', () => {
    it('should validate partial updates', async () => {
      const dto = plainToClass(UpdateClienteDto, {
        email: 'updated@example.com',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow updating ragioneSociale', async () => {
      const dto = plainToClass(UpdateClienteDto, {
        ragioneSociale: 'Updated SRL',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow updating contact info', async () => {
      const dto = plainToClass(UpdateClienteDto, {
        email: 'new@example.com',
        telefono: '9876543210',
        pec: 'newpec@example.com',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow updating address', async () => {
      const dto = plainToClass(UpdateClienteDto, {
        indirizzo: 'New Address 123',
        citta: 'Roma',
        provincia: 'RM',
        cap: '00100',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow empty updates', async () => {
      const dto = plainToClass(UpdateClienteDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
