import { DomainErrorCode } from '@betvision/shared';
import { PasswordPolicy, MIN_PASSWORD_LENGTH } from './password-policy';

describe('PasswordPolicy', () => {
  it('accepts a strong password (>=12 chars, 4 character classes)', () => {
    expect(PasswordPolicy.validate('Str0ng!Passw0rd')).toBeNull();
  });

  it('rejects a too-short password', () => {
    const error = PasswordPolicy.validate('Ab1!xy');
    expect(error?.code).toBe(DomainErrorCode.PASSWORD_TOO_SHORT);
    expect(error?.params['min']).toBe(MIN_PASSWORD_LENGTH);
  });

  it.each([
    ['no uppercase', 'abcdefgh1234!'],
    ['no lowercase', 'ABCDEFGH1234!'],
    ['no digit', 'AbcdefghIJKL!'],
    ['no symbol', 'Abcdefgh1234X'],
  ])('rejects a weak password (%s)', (_label, raw) => {
    const error = PasswordPolicy.validate(raw);
    expect(error?.code).toBe(DomainErrorCode.PASSWORD_TOO_WEAK);
  });

  it('rejects an absurdly long password (DoS guard)', () => {
    const error = PasswordPolicy.validate(`Aa1!${'x'.repeat(200)}`);
    expect(error?.code).toBe(DomainErrorCode.PASSWORD_TOO_WEAK);
  });
});
