import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';

describe('Users DTOs', () => {
  describe('CreateUserDto', () => {
    it('should validate a valid user dto', async () => {
      const dto = plainToClass(CreateUserDto, {
        email: 'test@example.com',
        password: 'password123',
        nome: 'Mario',
        cognome: 'Rossi',
        ruolo: 'collaboratore',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept all valid roles', async () => {
      const roles = ['admin', 'titolare_studio', 'avvocato', 'collaboratore', 'segreteria', 'cliente'];

      for (const ruolo of roles) {
        const dto = plainToClass(CreateUserDto, {
          email: 'test@example.com',
          password: 'password123',
          nome: 'Test',
          cognome: 'User',
          ruolo,
        });

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should accept optional studio id', async () => {
      const dto = plainToClass(CreateUserDto, {
        email: 'test@example.com',
        password: 'password123',
        nome: 'Test',
        cognome: 'User',
        ruolo: 'collaboratore',
        studioId: '123e4567-e89b-12d3-a456-426614174000',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept optional telefono', async () => {
      const dto = plainToClass(CreateUserDto, {
        email: 'test@example.com',
        password: 'password123',
        nome: 'Test',
        cognome: 'User',
        ruolo: 'collaboratore',
        telefono: '1234567890',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('UpdateUserDto', () => {
    it('should validate partial updates', async () => {
      const dto = plainToClass(UpdateUserDto, {
        nome: 'Updated',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow updating email', async () => {
      const dto = plainToClass(UpdateUserDto, {
        email: 'newemail@example.com',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow updating password', async () => {
      const dto = plainToClass(UpdateUserDto, {
        password: 'newpassword123',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow updating nome and cognome', async () => {
      const dto = plainToClass(UpdateUserDto, {
        nome: 'NewName',
        cognome: 'NewSurname',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow updating telefono', async () => {
      const dto = plainToClass(UpdateUserDto, {
        telefono: '9876543210',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow empty updates', async () => {
      const dto = plainToClass(UpdateUserDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow updating multiple fields', async () => {
      const dto = plainToClass(UpdateUserDto, {
        nome: 'Updated',
        cognome: 'User',
        email: 'updated@example.com',
        telefono: '1231231234',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
