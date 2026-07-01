// apps/api/src/auth/auth.controller.ts
// Auth endpoints under /api/v1/auth. Access token -> response body; refresh token -> httpOnly
// cookie (rotated on refresh, cleared on logout). All bodies validated against the shared zod
// contracts; all failures flow through the localized {data,error} envelope. Lightly throttled.
import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  RegisterUseCase,
  LoginUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
} from '@betvision/application';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import {
  registerRequestSchema,
  loginRequestSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  type RegisterRequest,
  type LoginRequest,
  type ForgotPasswordRequest,
  type ResetPasswordRequest,
  type AuthResponse,
  type RefreshResponse,
  type UserProfileDto,
} from '@betvision/contracts';
import { ZodValidationPipe } from '../common/http/zod-validation.pipe';
import { unwrap } from '../common/result/unwrap';
import {
  setRefreshCookie,
  clearRefreshCookie,
  readRefreshCookie,
} from '../common/http/auth-cookie';

@ApiTags('auth')
// Stricter rate limit on auth endpoints than the app-wide default (SPEC §19; Phase 18 hardens).
@Throttle({ default: { ttl: 60000, limit: 20 } })
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly forgotUseCase: ForgotPasswordUseCase,
    private readonly resetUseCase: ResetPasswordUseCase,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerRequestSchema)) body: RegisterRequest,
  ): Promise<UserProfileDto> {
    return unwrap(
      await this.registerUseCase.execute({
        email: body.email,
        password: body.password,
        locale: body.locale,
        ageConfirmed: body.ageConfirmed,
        acceptedTerms: body.acceptedTerms,
      }),
    );
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = unwrap(await this.loginUseCase.execute(body));
    setRefreshCookie(
      res,
      result.refreshToken,
      result.refreshMaxAgeSeconds,
      this.config.isProduction,
    );
    return result.auth;
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponse> {
    const result = unwrap(
      await this.refreshUseCase.execute({
        refreshToken: readRefreshCookie(req),
      }),
    );
    setRefreshCookie(
      res,
      result.refreshToken,
      result.refreshMaxAgeSeconds,
      this.config.isProduction,
    );
    return result.auth;
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    unwrap(
      await this.logoutUseCase.execute({
        refreshToken: readRefreshCookie(req),
      }),
    );
    clearRefreshCookie(res, this.config.isProduction);
    return { success: true };
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordRequestSchema))
    body: ForgotPasswordRequest,
  ): Promise<{ success: true }> {
    unwrap(await this.forgotUseCase.execute(body));
    return { success: true };
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordRequestSchema))
    body: ResetPasswordRequest,
  ): Promise<{ success: true }> {
    unwrap(await this.resetUseCase.execute(body));
    return { success: true };
  }
}
