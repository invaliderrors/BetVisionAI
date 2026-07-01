// Config wiring
export * from './config/config.module';

// Redis client
export * from './redis/redis.constants';
export * from './redis/redis.module';

// i18n adapter (implements the domain I18nPort)
export * from './i18n/i18n-translator';
export * from './i18n/nest-i18n.adapter';

// Prisma / persistence (adapters bound to the domain repo ports).
// NOTE: only the service + module are exported. Mappers, repository classes and
// generated Prisma types stay internal so Prisma never leaks past this boundary.
export * from './prisma/prisma.service';
export * from './prisma/prisma.module';

// System adapters (ClockPort / IdGeneratorPort).
export * from './system/system-clock';
export * from './system/uuid-id-generator';

// Phase-7 dev slice: DETERMINISTIC SYNTHETIC provider adapters (provenance DEV_SYNTHETIC), bound
// behind DATA_SOURCE_MODE=dev. Replaced by real licensed adapters in the live slice.
export * from './providers/dev/dev-synthetic';
export * from './providers/dev/dev-sports-data.provider';
export * from './providers/dev/dev-team-stats.provider';
export * from './providers/dev/dev-player-stats.provider';
export * from './providers/dev/dev-odds.provider';
export * from './providers/dev/dev-providers.module';

// Phase-9: feature store (Redis) + PredictionInput persistence (Prisma) + wiring module.
export * from './features/redis-feature-store';
export * from './features/prisma-prediction-input.repository';
export * from './features/features.module';

// Phase-10: statistical prediction model adapter (bound to PREDICTION_MODEL) + wiring module.
// The model adapter is the swap seam for a future Python model-service; the Prisma
// Prediction/PredictionResult repositories + mappers stay internal (bound only via the module).
export * from './prediction/statistical-prediction-model';
export * from './prediction/predictions.module';

// Phase-12: AI-analysis adapters (LlmExplanationPort dev/live + RagRetrieverPort dev stub) + the
// reports composition module. The Prisma AnalysisReport repository + mapper stay internal (bound
// only via ReportsModule).
export * from './ai-analysis/template-llm.adapter';
export * from './ai-analysis/anthropic-llm.adapter';
export * from './ai-analysis/dev-rag-retriever';
export * from './reports/reports.module';

// LLM_RESEARCH slice: free-text fixture research adapters (Anthropic web-search + dev synthetic)
// bound to FIXTURE_RESEARCH_PROVIDER, plus the AnalyzeFixtureUseCase composition module.
export * from './ai-analysis/anthropic-fixture-research.provider';
export * from './ai-analysis/dev-fixture-research.provider';
export * from './analyze/analyze.module';

// Auth / security adapters (Phase 5). The @Global AuthInfraModule binds them to their
// domain port tokens; the classes are exported for explicit composition/tests. The Prisma
// user repository + audit adapter stay internal (bound only via AuthInfraModule).
export * from './cache/redis-cache.adapter';
export * from './auth/argon2-password-hasher';
export * from './auth/jwt-token-service';
export * from './auth/redis-refresh-token-store';
export * from './notification/log-notification.adapter';
export * from './auth/auth-infra.module';
