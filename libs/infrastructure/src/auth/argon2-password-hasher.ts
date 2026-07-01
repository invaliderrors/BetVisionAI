// libs/infrastructure/src/auth/argon2-password-hasher.ts
// PasswordHasherPort adapter using Argon2id (SPEC §19). Parameters follow the OWASP
// Password Storage baseline; tests use deliberately LOW params (see forTests) so suites
// stay fast + deterministic without weakening production. verify() is constant-time
// (argon2.verify) and never throws — a malformed/`non-argon2` digest simply fails.
import * as argon2 from 'argon2';
import type { PasswordHasherPort } from '@betvision/domain';

export interface Argon2Params {
  /** KiB of memory. OWASP argon2id baseline: 19456 (19 MiB). */
  readonly memoryCost: number;
  /** Iterations. */
  readonly timeCost: number;
  /** Degree of parallelism. */
  readonly parallelism: number;
}

/** OWASP-recommended argon2id parameters for production. */
export const PRODUCTION_ARGON2_PARAMS: Argon2Params = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

/** Intentionally weak params for fast, deterministic tests. NEVER use in production. */
export const TEST_ARGON2_PARAMS: Argon2Params = {
  memoryCost: 512,
  timeCost: 1,
  parallelism: 1,
};

export class Argon2PasswordHasher implements PasswordHasherPort {
  private readonly options: argon2.Options & { raw?: false };

  constructor(params: Argon2Params = PRODUCTION_ARGON2_PARAMS) {
    this.options = {
      type: argon2.argon2id,
      memoryCost: params.memoryCost,
      timeCost: params.timeCost,
      parallelism: params.parallelism,
    };
  }

  /** Fast, low-cost hasher for tests. */
  static forTests(): Argon2PasswordHasher {
    return new Argon2PasswordHasher(TEST_ARGON2_PARAMS);
  }

  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, this.options);
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
