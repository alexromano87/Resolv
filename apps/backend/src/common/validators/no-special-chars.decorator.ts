import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

const NO_SPECIAL_CHARS_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,'/_&-]+$/u;

export function NoSpecialChars(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    registerDecorator({
      name: 'NoSpecialChars',
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null || value === '') return true;
          if (typeof value !== 'string') return false;
          return NO_SPECIAL_CHARS_REGEX.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contiene caratteri non consentiti`;
        },
      },
    });
  };
}
