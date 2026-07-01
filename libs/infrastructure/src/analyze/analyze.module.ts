// libs/infrastructure/src/analyze/analyze.module.ts
// Composition for the "analyze any free-text fixture" feature.
//   - FIXTURE_RESEARCH_PROVIDER → AnthropicFixtureResearchProvider (DATA_SOURCE_MODE=research and a
//     key present) | DevFixtureResearchProvider (deterministic, offline — dev/test default).
//   - AnalyzeFixtureUseCase wired to the research provider + the SAME statistical model
//     (PREDICTION_MODEL), RAG_RETRIEVER + LLM_EXPLANATION (dev template / live Anthropic per
//     LLM_MODE), CLOCK and ID_GENERATOR. The pure risk/value/kelly services are constructed inline.
//
// Imports the infra PredictionsModule (PREDICTION_MODEL) + ReportsModule (RAG_RETRIEVER,
// LLM_EXPLANATION), and relies on the @Global AuthInfraModule (CLOCK, ID_GENERATOR) + ConfigModule.
import { Module } from '@nestjs/common';
import {
  FIXTURE_RESEARCH_PROVIDER,
  PREDICTION_MODEL,
  RAG_RETRIEVER,
  LLM_EXPLANATION,
  CLOCK,
  ID_GENERATOR,
  DefaultRiskProfileService,
  DefaultValueCalculator,
  DefaultKellyStakeService,
  type FixtureResearchPort,
  type PredictionModelPort,
  type RagRetrieverPort,
  type LlmExplanationPort,
  type ClockPort,
  type IdGeneratorPort,
} from '@betvision/domain';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import { AnalyzeFixtureUseCase } from '@betvision/application';
import { PredictionsModule } from '../prediction/predictions.module';
import { ReportsModule } from '../reports/reports.module';
import { AnthropicFixtureResearchProvider } from '../ai-analysis/anthropic-fixture-research.provider';
import { DevFixtureResearchProvider } from '../ai-analysis/dev-fixture-research.provider';

@Module({
  imports: [PredictionsModule, ReportsModule],
  providers: [
    {
      // research (with a key) = web-search grounded Anthropic research; otherwise deterministic dev.
      provide: FIXTURE_RESEARCH_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): FixtureResearchPort =>
        config.dataSourceMode === 'research' && config.anthropicApiKey
          ? new AnthropicFixtureResearchProvider(config.anthropicApiKey)
          : new DevFixtureResearchProvider(),
    },
    {
      provide: AnalyzeFixtureUseCase,
      inject: [FIXTURE_RESEARCH_PROVIDER, PREDICTION_MODEL, RAG_RETRIEVER, LLM_EXPLANATION, CLOCK, ID_GENERATOR],
      useFactory: (
        research: FixtureResearchPort,
        model: PredictionModelPort,
        rag: RagRetrieverPort,
        narrator: LlmExplanationPort,
        clock: ClockPort,
        ids: IdGeneratorPort,
      ) =>
        new AnalyzeFixtureUseCase({
          research,
          model,
          riskProfiles: new DefaultRiskProfileService(),
          valueCalculator: new DefaultValueCalculator(),
          kelly: new DefaultKellyStakeService(),
          rag,
          narrator,
          clock,
          ids,
        }),
    },
  ],
  exports: [FIXTURE_RESEARCH_PROVIDER, AnalyzeFixtureUseCase],
})
export class AnalyzeModule {}
