// apps/api/src/users/users.controller.ts
// Authenticated self-service endpoints under /api/v1/users/me: profile read/update, RG
// self-limits, and GDPR export/delete. Every route requires a valid access token
// (JwtAuthGuard); the acting user id comes from the token, never the request body.
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  GetMeUseCase,
  UpdateProfileUseCase,
  SetSelfLimitUseCase,
  ExportUserDataUseCase,
  DeleteAccountUseCase,
  type AuthenticatedActor,
} from '@betvision/application';
import {
  updateProfileRequestSchema,
  selfLimitRequestSchema,
  type UpdateProfileRequest,
  type SelfLimitRequest,
  type UserProfileDto,
  type UserDataExportDto,
} from '@betvision/contracts';
import { ZodValidationPipe } from '../common/http/zod-validation.pipe';
import { unwrap } from '../common/result/unwrap';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly setSelfLimitUseCase: SetSelfLimitUseCase,
    private readonly exportUseCase: ExportUserDataUseCase,
    private readonly deleteUseCase: DeleteAccountUseCase,
  ) {}

  @Get('me')
  async me(@CurrentUser() actor?: AuthenticatedActor): Promise<UserProfileDto> {
    const userId = requireActor(actor);
    return unwrap(await this.getMeUseCase.execute({ userId }));
  }

  @Patch('me')
  async update(
    @Body(new ZodValidationPipe(updateProfileRequestSchema))
    body: UpdateProfileRequest,
    @CurrentUser() actor?: AuthenticatedActor,
  ): Promise<UserProfileDto> {
    const userId = requireActor(actor);
    return unwrap(
      await this.updateProfileUseCase.execute({
        userId,
        locale: body.locale,
        settings: body.settings,
      }),
    );
  }

  @Post('me/self-limit')
  @HttpCode(200)
  async setSelfLimit(
    @Body(new ZodValidationPipe(selfLimitRequestSchema)) body: SelfLimitRequest,
    @CurrentUser() actor?: AuthenticatedActor,
  ): Promise<UserProfileDto> {
    const userId = requireActor(actor);
    return unwrap(
      await this.setSelfLimitUseCase.execute({ userId, limits: body }),
    );
  }

  @Post('me/export')
  @HttpCode(200)
  async export(
    @CurrentUser() actor?: AuthenticatedActor,
  ): Promise<UserDataExportDto> {
    const userId = requireActor(actor);
    return unwrap(await this.exportUseCase.execute({ userId }));
  }

  @Delete('me')
  @HttpCode(200)
  async remove(
    @CurrentUser() actor?: AuthenticatedActor,
  ): Promise<{ success: true }> {
    const userId = requireActor(actor);
    unwrap(await this.deleteUseCase.execute({ userId }));
    return { success: true };
  }
}

function requireActor(actor: AuthenticatedActor | undefined): AuthenticatedActor['userId'] {
  if (!actor) throw new UnauthorizedException();
  return actor.userId;
}
