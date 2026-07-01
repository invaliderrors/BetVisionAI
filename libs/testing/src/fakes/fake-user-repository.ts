// libs/testing/src/fakes/fake-user-repository.ts
// In-memory UserRepositoryPort for zero-IO use-case tests. Indexes by id + normalized
// email and holds a small role catalog seeded by the test.
import type {
  UserRepositoryPort,
  User,
  Role,
  RoleName,
  UserId,
} from '@betvision/domain';

export class FakeUserRepository implements UserRepositoryPort {
  private readonly byId = new Map<string, User>();
  private readonly byEmail = new Map<string, User>();
  private readonly roles = new Map<string, Role>();

  seedRole(role: Role): this {
    this.roles.set(role.name, role);
    return this;
  }

  async findById(id: UserId): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.byEmail.get(email) ?? null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.byEmail.has(email);
  }

  async create(user: User): Promise<void> {
    this.index(user);
  }

  async update(user: User): Promise<void> {
    this.index(user);
  }

  async findRoleByName(name: RoleName): Promise<Role | null> {
    return this.roles.get(name) ?? null;
  }

  private index(user: User): void {
    this.byId.set(user.id, user);
    this.byEmail.set(user.email.value, user);
  }
}
