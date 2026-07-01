import { DomainErrorCode } from '@betvision/shared';
import { Email } from './email';

describe('Email value object', () => {
  it('accepts and normalizes a valid address (trim + lowercase)', () => {
    const result = Email.create('  User.Name@Example.COM  ');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.value).toBe('user.name@example.com');
    }
  });

  it('treats different casings as the same normalized value', () => {
    const a = Email.create('a@b.com');
    const b = Email.create('A@B.CoM');
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  it.each([
    ['empty', ''],
    ['no @', 'plainaddress'],
    ['no domain dot', 'user@localhost'],
    ['spaces inside', 'us er@example.com'],
    ['double @', 'a@@b.com'],
    ['no local part', '@example.com'],
  ])('rejects an invalid address (%s)', (_label, raw) => {
    const result = Email.create(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(DomainErrorCode.EMAIL_INVALID);
    }
  });

  it('rejects an over-length address', () => {
    const huge = `${'x'.repeat(250)}@example.com`;
    expect(Email.create(huge).ok).toBe(false);
  });
});
