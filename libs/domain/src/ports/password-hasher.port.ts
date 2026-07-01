// libs/domain/src/ports/password-hasher.port.ts
// Outbound port for password hashing/verification. The concrete adapter is Argon2id
// (infrastructure). The domain deliberately knows NOTHING about the algorithm or params;
// verification is constant-time and lives entirely behind this seam.
export interface PasswordHasherPort {
  /** Hash a raw password, returning an opaque digest string (algorithm-tagged). */
  hash(plain: string): Promise<string>;
  /** Constant-time verify of a raw password against a stored digest. */
  verify(hash: string, plain: string): Promise<boolean>;
}
