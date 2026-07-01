// fakes (one per outbound port)
export * from './fakes/provenance';
export * from './fakes/fake-clock.port';
export * from './fakes/fake-id-generator.port';
export * from './fakes/fake-prediction-model.port';
export * from './fakes/fake-match-repository';
export * from './fakes/fake-team-repository';
export * from './fakes/fake-competition-repository';
export * from './fakes/fake-odds-repository';
export * from './fakes/fake-sports-data-provider';
export * from './fakes/fake-team-stats-provider';
export * from './fakes/fake-player-stats-provider';
export * from './fakes/fake-referee-stats-provider';
export * from './fakes/fake-weather-provider';
export * from './fakes/fake-injury-provider';
export * from './fakes/fake-lineup-provider';
export * from './fakes/fake-odds-provider';
export * from './fakes/fake-feature-store';
export * from './fakes/fake-llm-explanation.port';
export * from './fakes/fake-rag-retriever';
export * from './fakes/fake-cache';
export * from './fakes/fake-audit-log';
export * from './fakes/fake-notification.port';
export * from './fakes/fake-i18n.port';
export * from './fakes/fake-event-bus';
// auth / accounts (Phase 5)
export * from './fakes/fake-user-repository';
export * from './fakes/fake-password-hasher';
export * from './fakes/fake-token-service';
export * from './fakes/fake-refresh-token-store';
// features (Phase 9)
export * from './fakes/fake-prediction-input-repository';
// predictions (Phase 10)
export * from './fakes/fake-prediction-repository';
export * from './fakes/fake-prediction-result-repository';
// value betting (Phase 11)
export * from './fakes/fake-recommendation-repository';
// AI-generated reports (Phase 12)
export * from './fakes/fake-analysis-report-repository';
// analyze any free-text fixture (LLM_RESEARCH slice)
export * from './fakes/fake-fixture-research-provider';
// object mothers
export * from './mothers/vo.mother';
export * from './mothers/model-score.mother';
export * from './mothers/match.mother';
export * from './mothers/explanation.mother';
export * from './mothers/feature.mother';
export * from './mothers/value-betting.mother';
