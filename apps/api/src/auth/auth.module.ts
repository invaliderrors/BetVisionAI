// apps/api/src/auth/auth.module.ts
// Composition root for the auth feature: binds each use case to the domain port tokens
// (provided globally by AuthInfraModule) and exposes AuthController. AUTH_TOKENS_CONFIG is
// derived from the validated AppConfig JWT TTLs.
import { Module } from '@nestjs/common';
import {
  USER_REPOSITORY,
  PASSWORD_HASHER,
  TOKEN_SERVICE,
  REFRESH_TOKEN_STORE,
  CACHE,
  NOTIFICATION,
  CLOCK,
  ID_GENERATOR,
  AUDIT_LOG,
  type UserRepositoryPort,
  type PasswordHasherPort,
  type TokenServicePort,
  type RefreshTokenStorePort,
  type CachePort,
  type NotificationPort,
  type ClockPort,
  type IdGeneratorPort,
  type AuditLogPort,
} from '@betvision/domain';
import {
  AUTH_TOKENS_CONFIG,
  type AuthTokensConfig,
  RegisterUseCase,
  LoginUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
} from '@betvision/application';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_TOKENS_CONFIG,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): AuthTokensConfig => ({
        accessTtlSeconds: config.jwt.accessTtlSeconds,
        refreshTtlSeconds: config.jwt.refreshTtlSeconds,
        resetTokenTtlSeconds: 900,
      }),
    },
    {
      provide: RegisterUseCase,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, CLOCK, ID_GENERATOR, AUDIT_LOG],
      useFactory: (
        users: UserRepositoryPort,
        hasher: PasswordHasherPort,
        clock: ClockPort,
        ids: IdGeneratorPort,
        audit: AuditLogPort,
      ) => new RegisterUseCase(users, hasher, clock, ids, audit),
    },
    {
      provide: LoginUseCase,
      inject: [
        USER_REPOSITORY,
        PASSWORD_HASHER,
        TOKEN_SERVICE,
        REFRESH_TOKEN_STORE,
        ID_GENERATOR,
        CLOCK,
        AUDIT_LOG,
        AUTH_TOKENS_CONFIG,
      ],
      useFactory: (
        users: UserRepositoryPort,
        hasher: PasswordHasherPort,
        tokens: TokenServicePort,
        refreshStore: RefreshTokenStorePort,
        ids: IdGeneratorPort,
        clock: ClockPort,
        audit: AuditLogPort,
        config: AuthTokensConfig,
      ) =>
        new LoginUseCase(
          users,
          hasher,
          tokens,
          refreshStore,
          ids,
          clock,
          audit,
          config,
        ),
    },
    {
      provide: RefreshTokenUseCase,
      inject: [
        USER_REPOSITORY,
        TOKEN_SERVICE,
        REFRESH_TOKEN_STORE,
        ID_GENERATOR,
        CLOCK,
        AUDIT_LOG,
        AUTH_TOKENS_CONFIG,
      ],
      useFactory: (
        users: UserRepositoryPort,
        tokens: TokenServicePort,
        refreshStore: RefreshTokenStorePort,
        ids: IdGeneratorPort,
        clock: ClockPort,
        audit: AuditLogPort,
        config: AuthTokensConfig,
      ) =>
        new RefreshTokenUseCase(
          users,
          tokens,
          refreshStore,
          ids,
          clock,
          audit,
          config,
        ),
    },
    {
      provide: LogoutUseCase,
      inject: [TOKEN_SERVICE, REFRESH_TOKEN_STORE, CLOCK, AUDIT_LOG],
      useFactory: (
        tokens: TokenServicePort,
        refreshStore: RefreshTokenStorePort,
        clock: ClockPort,
        audit: AuditLogPort,
      ) => new LogoutUseCase(tokens, refreshStore, clock, audit),
    },
    {
      provide: ForgotPasswordUseCase,
      inject: [
        USER_REPOSITORY,
        CACHE,
        NOTIFICATION,
        ID_GENERATOR,
        CLOCK,
        AUDIT_LOG,
        AUTH_TOKENS_CONFIG,
      ],
      useFactory: (
        users: UserRepositoryPort,
        cache: CachePort,
        notifications: NotificationPort,
        ids: IdGeneratorPort,
        clock: ClockPort,
        audit: AuditLogPort,
        config: AuthTokensConfig,
      ) =>
        new ForgotPasswordUseCase(
          users,
          cache,
          notifications,
          ids,
          clock,
          audit,
          config,
        ),
    },
    {
      provide: ResetPasswordUseCase,
      inject: [
        USER_REPOSITORY,
        PASSWORD_HASHER,
        CACHE,
        REFRESH_TOKEN_STORE,
        CLOCK,
        AUDIT_LOG,
      ],
      useFactory: (
        users: UserRepositoryPort,
        hasher: PasswordHasherPort,
        cache: CachePort,
        refreshStore: RefreshTokenStorePort,
        clock: ClockPort,
        audit: AuditLogPort,
      ) =>
        new ResetPasswordUseCase(
          users,
          hasher,
          cache,
          refreshStore,
          clock,
          audit,
        ),
    },
  ],
})
export class AuthModule {}
