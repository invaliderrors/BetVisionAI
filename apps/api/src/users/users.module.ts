// apps/api/src/users/users.module.ts
// Composition root for the users feature: binds the profile/RG/GDPR use cases to the domain
// port tokens (provided globally by AuthInfraModule) and registers the guards used by
// UsersController.
import { Module } from '@nestjs/common';
import {
  USER_REPOSITORY,
  REFRESH_TOKEN_STORE,
  CLOCK,
  AUDIT_LOG,
  type UserRepositoryPort,
  type RefreshTokenStorePort,
  type ClockPort,
  type AuditLogPort,
} from '@betvision/domain';
import {
  GetMeUseCase,
  UpdateProfileUseCase,
  SetSelfLimitUseCase,
  ExportUserDataUseCase,
  DeleteAccountUseCase,
} from '@betvision/application';
import { UsersController } from './users.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [UsersController],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    {
      provide: GetMeUseCase,
      inject: [USER_REPOSITORY],
      useFactory: (users: UserRepositoryPort) => new GetMeUseCase(users),
    },
    {
      provide: UpdateProfileUseCase,
      inject: [USER_REPOSITORY, CLOCK, AUDIT_LOG],
      useFactory: (
        users: UserRepositoryPort,
        clock: ClockPort,
        audit: AuditLogPort,
      ) => new UpdateProfileUseCase(users, clock, audit),
    },
    {
      provide: SetSelfLimitUseCase,
      inject: [USER_REPOSITORY, CLOCK, AUDIT_LOG],
      useFactory: (
        users: UserRepositoryPort,
        clock: ClockPort,
        audit: AuditLogPort,
      ) => new SetSelfLimitUseCase(users, clock, audit),
    },
    {
      provide: ExportUserDataUseCase,
      inject: [USER_REPOSITORY, CLOCK, AUDIT_LOG],
      useFactory: (
        users: UserRepositoryPort,
        clock: ClockPort,
        audit: AuditLogPort,
      ) => new ExportUserDataUseCase(users, clock, audit),
    },
    {
      provide: DeleteAccountUseCase,
      inject: [USER_REPOSITORY, REFRESH_TOKEN_STORE, CLOCK, AUDIT_LOG],
      useFactory: (
        users: UserRepositoryPort,
        refreshStore: RefreshTokenStorePort,
        clock: ClockPort,
        audit: AuditLogPort,
      ) => new DeleteAccountUseCase(users, refreshStore, clock, audit),
    },
  ],
})
export class UsersModule {}
