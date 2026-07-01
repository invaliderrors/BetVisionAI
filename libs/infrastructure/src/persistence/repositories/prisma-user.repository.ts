// libs/infrastructure/src/persistence/repositories/prisma-user.repository.ts
// UserRepositoryPort adapter over Prisma. Accepts/returns ONLY domain types (User / Role);
// all queries are parameterized (Prisma) so there is no SQL-injection surface. Email lookups
// use the unique-indexed normalized address produced by the Email VO.
import { Injectable } from '@nestjs/common';
import type {
  UserRepositoryPort,
  User,
  Role,
  RoleName,
  UserId,
} from '@betvision/domain';
import { PrismaService } from '../../prisma/prisma.service';
import {
  userInclude,
  toDomainUser,
  toInputJson,
  LOCALE_TO_LANGUAGE,
  STATUS_TO_PRISMA,
  ROLE_NAME_TO_PRISMA,
} from '../mappers/user.mapper';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: UserId): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
    return row ? toDomainUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { email },
      include: userInclude,
    });
    return row ? toDomainUser(row) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const found = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return found !== null;
  }

  async create(user: User): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email.value,
        passwordHash: user.passwordHash.value,
        roleId: user.role.id,
        locale: LOCALE_TO_LANGUAGE[user.locale],
        status: STATUS_TO_PRISMA[user.status],
        ageConfirmedAt: user.ageConfirmedAt
          ? new Date(user.ageConfirmedAt)
          : null,
        selfLimitJson: toInputJson(user.selfLimits),
        settings: toInputJson(user.settings),
        createdAt: new Date(user.createdAt),
      },
    });
  }

  async update(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email.value,
        passwordHash: user.passwordHash.value,
        roleId: user.role.id,
        locale: LOCALE_TO_LANGUAGE[user.locale],
        status: STATUS_TO_PRISMA[user.status],
        ageConfirmedAt: user.ageConfirmedAt
          ? new Date(user.ageConfirmedAt)
          : null,
        selfLimitJson: toInputJson(user.selfLimits),
        settings: toInputJson(user.settings),
        deletedAt: user.deletedAt ? new Date(user.deletedAt) : null,
      },
    });
  }

  async findRoleByName(name: RoleName): Promise<Role | null> {
    const row = await this.prisma.role.findUnique({
      where: { name: ROLE_NAME_TO_PRISMA[name] },
    });
    return row
      ? { id: row.id, name, permissions: row.permissions }
      : null;
  }
}
