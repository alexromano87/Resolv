// apps/backend/src/common/validators/is-future-date.decorator.ts
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsFutureOrTodayDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isFutureOrTodayDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return false;

          const inputDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          inputDate.setHours(0, 0, 0, 0);

          return inputDate >= today;
        },
        defaultMessage(args: ValidationArguments) {
          return 'La data di scadenza non può essere nel passato';
        },
      },
    });
  };
}
