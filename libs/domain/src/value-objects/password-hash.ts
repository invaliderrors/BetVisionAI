// libs/domain/src/value-objects/password-hash.ts
// Opaque wrapper around an ALREADY-HASHED password. The domain never sees, stores, or
// compares plaintext — hashing/verification live behind PasswordHasherPort (argon2id in
// infrastructure). This VO exists so the User aggregate holds a typed, non-empty digest
// rather than a bare string, and so a plaintext can never be mistaken for a hash.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';

export class PasswordHash {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  /** Build from a digest already produced by PasswordHasherPort.hash(). */
  static create(hash: string): Result<PasswordHash, DomainError> {
    if (typeof hash !== 'string' || hash.trim().length === 0) {
      return err(
        DomainError.of(DomainErrorCode.PASSWORD_HASH_INVALID, {
          field: 'passwordHash',
        }),
      );
    }
    return ok(new PasswordHash(hash));
  }

  toString(): string {
    return this.value;
  }
}
