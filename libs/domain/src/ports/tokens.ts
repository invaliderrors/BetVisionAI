// libs/domain/src/ports/tokens.ts
// One Symbol per port. Co-located with the interfaces; framework-agnostic (works with
// NestJS @Inject(TOKEN), but is just a Symbol — no NestJS import here).

export const MATCH_REPOSITORY = Symbol('MatchRepositoryPort');
export const TEAM_REPOSITORY = Symbol('TeamRepositoryPort');
export const COMPETITION_REPOSITORY = Symbol('CompetitionRepositoryPort');
export const ODDS_REPOSITORY = Symbol('OddsRepositoryPort');
export const SPORTS_DATA_PROVIDER = Symbol('SportsDataProviderPort');
export const ODDS_PROVIDER = Symbol('OddsProviderPort');
export const REFEREE_STATS_PROVIDER = Symbol('RefereeStatsProviderPort');
export const WEATHER_PROVIDER = Symbol('WeatherProviderPort');
export const INJURY_PROVIDER = Symbol('InjuryProviderPort');
export const LINEUP_PROVIDER = Symbol('LineupProviderPort');
export const TEAM_STATS_PROVIDER = Symbol('TeamStatsProviderPort');
export const PLAYER_STATS_PROVIDER = Symbol('PlayerStatsProviderPort');
export const LLM_EXPLANATION = Symbol('LlmExplanationPort');
export const RAG_RETRIEVER = Symbol('RagRetrieverPort');
export const CACHE = Symbol('CachePort');
export const FEATURE_STORE = Symbol('FeatureStorePort');
export const PREDICTION_MODEL = Symbol('PredictionModelPort');
export const AUDIT_LOG = Symbol('AuditLogPort');
export const NOTIFICATION = Symbol('NotificationPort');
// Auth / accounts (Phase 5)
export const USER_REPOSITORY = Symbol('UserRepositoryPort');
export const PASSWORD_HASHER = Symbol('PasswordHasherPort');
export const TOKEN_SERVICE = Symbol('TokenServicePort');
export const REFRESH_TOKEN_STORE = Symbol('RefreshTokenStorePort');
export const I18N = Symbol('I18nPort');
export const CLOCK = Symbol('ClockPort');
export const ID_GENERATOR = Symbol('IdGeneratorPort');
export const EVENT_BUS = Symbol('EventBusPort');

// Domain services that are injected as collaborators also get tokens:
export const ELO_RATING_SERVICE = Symbol('EloRatingService');
export const POISSON_GOAL_MODEL = Symbol('PoissonGoalModel');
export const VALUE_CALCULATOR = Symbol('ValueCalculator');
export const KELLY_STAKE_SERVICE = Symbol('KellyStakeService');
export const RISK_PROFILE_SERVICE = Symbol('RiskProfileService');
