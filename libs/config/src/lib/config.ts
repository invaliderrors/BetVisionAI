// libs/config/src/lib/config.ts
// Framework-light, zod-validated environment loader. Apps wrap `loadConfig()` in a
// thin Nest module and bind the resulting AppConfig to the APP_CONFIG token.
// Fails fast at boot with a clear, aggregated message when env is invalid/missing.
import { z } from 'zod';

export const NODE_ENVS = ['development', 'test', 'production'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Where outbound sports/odds data comes from. `dev` binds the DETERMINISTIC SYNTHETIC provider
 * adapters (Phase-7 dev slice, provenance DEV_SYNTHETIC); `live` will bind the real, licensed
 * adapters once they land. Defaults to `dev` because no live adapter exists yet.
 */
export const DATA_SOURCE_MODES = ['dev', 'live'] as const;
export type DataSourceMode = (typeof DATA_SOURCE_MODES)[number];

/**
 * Which LLM adapter backs the AI-report explanation layer (Phase 12). `dev` (default) binds the
 * DETERMINISTIC TemplateLlmAdapter — no API key, no network — which is what runs and is tested
 * here. `live` binds the AnthropicLlmAdapter (requires ANTHROPIC_API_KEY). The LLM only EXPLAINS
 * the persisted numbers; it never produces or alters one.
 */
export const LLM_MODES = ['dev', 'live'] as const;
export type LlmMode = (typeof LLM_MODES)[number];

/**
 * DI token for the resolved {@link AppConfig}. It is a plain `Symbol`, so it stays
 * framework-agnostic (works with NestJS `@Inject(APP_CONFIG)` without importing Nest here).
 */
export const APP_CONFIG = Symbol('AppConfig');

const envSchema = z.object({
  NODE_ENV: z.enum(NODE_ENVS).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(604800),
  DEFAULT_LOCALE: z.enum(SUPPORTED_LOCALES).default('en'),
  DATA_SOURCE_MODE: z.enum(DATA_SOURCE_MODES).default('dev'),
  LLM_MODE: z.enum(LLM_MODES).default('dev'),
  // Optional provider / LLM keys — present in prod, absent in most local/test runs.
  ANTHROPIC_API_KEY: z.string().optional(),
  SPORTS_DATA_API_KEY: z.string().optional(),
  ODDS_API_KEY: z.string().optional(),
  INJURIES_API_KEY: z.string().optional(),
  LINEUPS_API_KEY: z.string().optional(),
  REFEREE_API_KEY: z.string().optional(),
  WEATHER_API_KEY: z.string().optional(),
});

export type RawEnv = z.infer<typeof envSchema>;

/** Grouped JWT settings (secrets never leak into logs — see the pino redaction config). */
export interface JwtConfig {
  readonly accessSecret: string;
  readonly refreshSecret: string;
  readonly accessTtlSeconds: number;
  readonly refreshTtlSeconds: number;
}

/** Optional external-provider API keys, wired to their ports in later phases. */
export interface ProviderKeys {
  readonly sportsData?: string;
  readonly odds?: string;
  readonly injuries?: string;
  readonly lineups?: string;
  readonly referee?: string;
  readonly weather?: string;
}

/** The fully typed, validated application configuration (camelCase per TS conventions). */
export interface AppConfig {
  readonly nodeEnv: NodeEnv;
  readonly isProduction: boolean;
  readonly port: number;
  readonly databaseUrl: string;
  readonly redisUrl: string;
  readonly jwt: JwtConfig;
  readonly defaultLocale: SupportedLocale;
  readonly dataSourceMode: DataSourceMode;
  readonly llmMode: LlmMode;
  readonly anthropicApiKey?: string;
  readonly providerKeys: ProviderKeys;
}

/** Thrown when env validation fails. Carries every issue so boot logs are actionable. */
export class EnvValidationError extends Error {
  readonly _tag = 'EnvValidationError' as const;
  constructor(readonly issues: readonly string[]) {
    super(
      `Invalid environment configuration:\n${issues
        .map((issue) => `  - ${issue}`)
        .join('\n')}`,
    );
    this.name = 'EnvValidationError';
  }
}

/**
 * Validate and map the process environment into a typed {@link AppConfig}.
 * Throws {@link EnvValidationError} (fail-fast) when any required value is missing/invalid.
 */
export function loadConfig(
  source: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const path = issue.path.join('.') || '(root)';
      return `${path}: ${issue.message}`;
    });
    throw new EnvValidationError(issues);
  }

  const env = parsed.data;
  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtlSeconds: env.JWT_ACCESS_TTL,
      refreshTtlSeconds: env.JWT_REFRESH_TTL,
    },
    defaultLocale: env.DEFAULT_LOCALE,
    dataSourceMode: env.DATA_SOURCE_MODE,
    llmMode: env.LLM_MODE,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    providerKeys: {
      sportsData: env.SPORTS_DATA_API_KEY,
      odds: env.ODDS_API_KEY,
      injuries: env.INJURIES_API_KEY,
      lineups: env.LINEUPS_API_KEY,
      referee: env.REFEREE_API_KEY,
      weather: env.WEATHER_API_KEY,
    },
  };
}
