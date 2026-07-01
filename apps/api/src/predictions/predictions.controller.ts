// apps/api/src/predictions/predictions.controller.ts
// Prediction endpoints under /api/v1/predictions. Authenticated (JwtAuthGuard); reuses the shared
// zod contracts + {data,error} envelope. POST runs the statistical model (objective probabilities)
// then applies the caller's RiskAppetite (value detection) SYNCHRONOUSLY — dev compute is fast.
// GET returns the stored run + results + persisted recommendation set.
//
// GUARDRAIL (Feature Spec B): riskAppetite only shapes WHICH bets surface + stake sizing; the model
// probabilities are identical at any appetite. Async/job + SSE progress is a Phase-14 follow-up.
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  RunPredictionUseCase,
  DetectValueBetsUseCase,
  GetPredictionUseCase,
  type AuthenticatedActor,
} from '@betvision/application';
import type { MatchId, MarketKey, PredictionId } from '@betvision/domain';
import {
  createPredictionRequestSchema,
  type CreatePredictionRequest,
  type PredictionResponseDto,
  type PredictionDetailDto,
} from '@betvision/contracts';
import { ZodValidationPipe } from '../common/http/zod-validation.pipe';
import { unwrap } from '../common/result/unwrap';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toPredictionResponse, toPredictionDetail } from './prediction-response.mapper';

@ApiTags('predictions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'predictions', version: '1' })
export class PredictionsController {
  constructor(
    private readonly runPrediction: RunPredictionUseCase,
    private readonly detectValueBets: DetectValueBetsUseCase,
    private readonly getPrediction: GetPredictionUseCase,
  ) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createPredictionRequestSchema)) body: CreatePredictionRequest,
    @CurrentUser() actor?: AuthenticatedActor,
  ): Promise<PredictionResponseDto> {
    const run = unwrap(
      await this.runPrediction.execute({
        matchId: body.matchId as MatchId,
        markets: body.markets as MarketKey[] | undefined,
        requestedById: actor?.userId,
      }),
    );
    const detect = unwrap(
      await this.detectValueBets.execute({
        predictionId: run.predictionId,
        riskAppetite: body.riskAppetite,
      }),
    );
    return toPredictionResponse(run, detect);
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<PredictionDetailDto> {
    return toPredictionDetail(
      unwrap(await this.getPrediction.execute({ predictionId: id as PredictionId })),
    );
  }
}
