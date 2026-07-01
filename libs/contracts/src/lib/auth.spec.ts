import {
  registerRequestSchema,
  loginRequestSchema,
  resetPasswordRequestSchema,
} from './auth';
import { selfLimitRequestSchema, updateProfileRequestSchema } from './users';

describe('auth/user contracts', () => {
  it('accepts a valid registration', () => {
    const parsed = registerRequestSchema.safeParse({
      email: 'player@example.com',
      password: 'Str0ng!Passw0rd',
      locale: 'es',
      ageConfirmed: true,
      acceptedTerms: true,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects registration when ageConfirmed is not literal true', () => {
    const parsed = registerRequestSchema.safeParse({
      email: 'player@example.com',
      password: 'Str0ng!Passw0rd',
      ageConfirmed: false,
      acceptedTerms: true,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a weak password (missing complexity)', () => {
    const parsed = registerRequestSchema.safeParse({
      email: 'player@example.com',
      password: 'alllowercaseonly',
      ageConfirmed: true,
      acceptedTerms: true,
    });
    expect(parsed.success).toBe(false);
  });

  it('defaults locale to en when omitted', () => {
    const parsed = registerRequestSchema.parse({
      email: 'player@example.com',
      password: 'Str0ng!Passw0rd',
      ageConfirmed: true,
      acceptedTerms: true,
    });
    expect(parsed.locale).toBe('en');
  });

  it('validates login shape', () => {
    expect(
      loginRequestSchema.safeParse({ email: 'a@b.com', password: 'x' }).success,
    ).toBe(true);
    expect(loginRequestSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });

  it('requires a token + strong password on reset', () => {
    expect(
      resetPasswordRequestSchema.safeParse({
        token: 't',
        password: 'Str0ng!Passw0rd',
      }).success,
    ).toBe(true);
    expect(
      resetPasswordRequestSchema.safeParse({ token: '', password: 'weak' })
        .success,
    ).toBe(false);
  });

  it('requires at least one field on profile update', () => {
    expect(updateProfileRequestSchema.safeParse({}).success).toBe(false);
    expect(updateProfileRequestSchema.safeParse({ locale: 'es' }).success).toBe(
      true,
    );
  });

  it('requires at least one self-limit', () => {
    expect(selfLimitRequestSchema.safeParse({}).success).toBe(false);
    expect(
      selfLimitRequestSchema.safeParse({ dailyDepositLimit: 100 }).success,
    ).toBe(true);
  });
});
