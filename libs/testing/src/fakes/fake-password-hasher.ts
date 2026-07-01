// libs/testing/src/fakes/fake-password-hasher.ts
// Deterministic, fast PasswordHasherPort for tests (no argon2 cost). Digest is a stable
// prefix over the plaintext so verify is an exact comparison.
import type { PasswordHasherPort } from '@betvision/domain';

const PREFIX = 'faux-hash::';

export class FakePasswordHasher implements PasswordHasherPort {
  async hash(plain: string): Promise<string> {
    return `${PREFIX}${plain}`;
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    return hash === `${PREFIX}${plain}`;
  }
}
