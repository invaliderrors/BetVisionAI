// libs/domain/src/ports/user-repository.port.ts
// Outbound port for account persistence. Exchanges ONLY domain types (User / Role);
// the Prisma adapter maps rows <-> aggregate. Email lookups use the normalized address.
import type { User } from '../users/entities/user.entity';
import type { Role, RoleName } from '../users/types';
import type { UserId } from './shared.dto';

export interface UserRepositoryPort {
  findById(id: UserId): Promise<User | null>;
  /** Lookup by NORMALIZED email (trimmed + lowercased, as produced by the Email VO). */
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  /** Insert a newly-registered account. */
  create(user: User): Promise<void>;
  /** Persist mutations of an existing account (locale/status/passwordHash/limits/...). */
  update(user: User): Promise<void>;
  /** Resolve a role by its canonical name (used to assign the default role at signup). */
  findRoleByName(name: RoleName): Promise<Role | null>;
}
