// apps/api/src/analyze/analyze.controller.ts
// POST /api/v1/analyze — analyze ANY free-text fixture. Authenticated (JwtAuthGuard); reuses the
// shared zod contract + {data,error} envelope. The AnalyzeFixtureUseCase researches the fixture with
// Claude (web search) to ESTIMATE the inputs, runs the SAME statistical pipeline, and returns a
// bilingual, risk-graded recommendation with an explicit AI-ESTIMATED-inputs disclaimer.
//
// Synchronous is fine for now (dev/research compute is a single Anthropic round-trip + pure math).
// Async/job + SSE progress is a follow-up (mirrors the Phase-14 note on POST /predictions).
//
// GUARDRAIL: riskAppetite only shapes WHICH bets surface + stake sizing; model probabilities are
// identical at any appetite, and the narrator never emits or alters a number.
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnalyzeFixtureUseCase } from '@betvision/application';
import type { Locale } from '@betvision/domain';
import {
  analyzeFixtureRequestSchema,
  type AnalyzeFixtureRequest,
  type AnalyzeFixtureResponseDto,
} from '@betvision/contracts';
import { ZodValidationPipe } from '../common/http/zod-validation.pipe';
import { unwrap } from '../common/result/unwrap';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { toAnalyzeFixtureResponse } from './analyze-response.mapper';

@ApiTags('analyze')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'analyze', version: '1' })
export class AnalyzeController {
  constructor(private readonly analyzeFixture: AnalyzeFixtureUseCase) {}

  @Post()
  async analyze(
    @Body(new ZodValidationPipe(analyzeFixtureRequestSchema)) body: AnalyzeFixtureRequest,
  ): Promise<AnalyzeFixtureResponseDto> {
    const result = unwrap(
      await this.analyzeFixture.execute({
        query: body.query,
        riskAppetite: body.riskAppetite,
        language: body.language as Locale,
      }),
    );
    return toAnalyzeFixtureResponse(result);
  }
}
