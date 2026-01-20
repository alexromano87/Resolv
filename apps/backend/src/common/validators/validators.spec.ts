import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { NoSpecialChars } from './no-special-chars.decorator';
import { IsFutureOrTodayDate } from './is-future-date.decorator';

class TestNoSpecialCharsDto {
  @NoSpecialChars()
  name: string;
}

class TestFutureDateDto {
  @IsFutureOrTodayDate()
  date: Date;
}

describe('Custom Validators', () => {
  describe('NoSpecialChars', () => {
    it('should accept valid strings without special chars', async () => {
      const dto = plainToClass(TestNoSpecialCharsDto, {
        name: 'Mario Rossi',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept strings with accented characters', async () => {
      const dto = plainToClass(TestNoSpecialCharsDto, {
        name: 'José María Peña',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept strings with numbers', async () => {
      const dto = plainToClass(TestNoSpecialCharsDto, {
        name: 'Via Roma 123',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept strings with allowed punctuation', async () => {
      const dto = plainToClass(TestNoSpecialCharsDto, {
        name: "Test & Co., S.r.l. - via dell'amore",
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject strings with special characters', async () => {
      const dto = plainToClass(TestNoSpecialCharsDto, {
        name: 'Test<script>alert(1)</script>',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('NoSpecialChars');
    });

    it('should reject strings with SQL injection attempts', async () => {
      const dto = plainToClass(TestNoSpecialCharsDto, {
        name: "Mario'; DROP TABLE users; --",
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept empty strings', async () => {
      const dto = plainToClass(TestNoSpecialCharsDto, {
        name: '',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept null values', async () => {
      const dto = plainToClass(TestNoSpecialCharsDto, {
        name: null,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept undefined values', async () => {
      const dto = plainToClass(TestNoSpecialCharsDto, {
        name: undefined,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('IsFutureOrTodayDate', () => {
    it('should accept today date', async () => {
      const today = new Date();
      const dto = plainToClass(TestFutureDateDto, {
        date: today,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const dto = plainToClass(TestFutureDateDto, {
        date: futureDate,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject past dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const dto = plainToClass(TestFutureDateDto, {
        date: pastDate,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isFutureOrTodayDate');
      expect(errors[0].constraints.isFutureOrTodayDate).toBe(
        'La data di scadenza non può essere nel passato',
      );
    });

    it('should reject null dates', async () => {
      const dto = plainToClass(TestFutureDateDto, {
        date: null,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject undefined dates', async () => {
      const dto = plainToClass(TestFutureDateDto, {
        date: undefined,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle date strings correctly', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dto = plainToClass(TestFutureDateDto, {
        date: tomorrow.toISOString() as any,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
