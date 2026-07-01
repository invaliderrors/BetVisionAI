import {
  APP_CONFIG,
  EnvValidationError,
  loadConfig,
  type AppConfig,
} from './config';

/** A minimal, fully-valid environment used as the baseline for each test. */
const validEnv = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'test',
  PORT: '4000',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db?schema=public',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  DEFAULT_LOCALE: 'es',
});

describe('loadConfig', () => {
  it('parses and maps a valid environment into a typed AppConfig', () => {
    const config: AppConfig = loadConfig(validEnv());

    expect(config.nodeEnv).toBe('test');
    expect(config.isProduction).toBe(false);
    expect(config.port).toBe(4000);
    expect(config.defaultLocale).toBe('es');
    expect(config.jwt.accessSecret).toBe('a'.repeat(32));
    expect(config.jwt.accessTtlSeconds).toBe(900); // default applied
    expect(config.jwt.refreshTtlSeconds).toBe(604800); // default applied
    expect(config.dataSourceMode).toBe('dev'); // default applied
    expect(config.llmMode).toBe('dev'); // default applied
    expect(config.anthropicApiKey).toBeUndefined();
    expect(config.providerKeys.odds).toBeUndefined();
  });

  it('parses an explicit DATA_SOURCE_MODE and rejects an unknown one', () => {
    const live = loadConfig({ ...validEnv(), DATA_SOURCE_MODE: 'live' });
    expect(live.dataSourceMode).toBe('live');
    expect(() => loadConfig({ ...validEnv(), DATA_SOURCE_MODE: 'satellite' })).toThrow(
      EnvValidationError,
    );
  });

  it('parses an explicit LLM_MODE (+ optional ANTHROPIC_API_KEY) and rejects an unknown one', () => {
    const live = loadConfig({
      ...validEnv(),
      LLM_MODE: 'live',
      ANTHROPIC_API_KEY: 'sk-ant-test',
    });
    expect(live.llmMode).toBe('live');
    expect(live.anthropicApiKey).toBe('sk-ant-test');
    expect(() => loadConfig({ ...validEnv(), LLM_MODE: 'gpt' })).toThrow(EnvValidationError);
  });

  it('applies documented defaults for optional values', () => {
    const env = validEnv();
    delete env['PORT'];
    delete env['DEFAULT_LOCALE'];
    delete env['NODE_ENV'];

    const config = loadConfig(env);

    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBe(3000);
    expect(config.defaultLocale).toBe('en');
  });

  it('fails fast with a clear, aggregated message when required env is missing', () => {
    const env = validEnv();
    delete env['DATABASE_URL'];
    delete env['JWT_ACCESS_SECRET'];

    expect(() => loadConfig(env)).toThrow(EnvValidationError);

    try {
      loadConfig(env);
      fail('expected loadConfig to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const validationError = error as EnvValidationError;
      expect(validationError.message).toContain(
        'Invalid environment configuration',
      );
      expect(validationError.issues.join('\n')).toContain('DATABASE_URL');
      expect(validationError.issues.join('\n')).toContain('JWT_ACCESS_SECRET');
    }
  });

  it('rejects an out-of-range PORT and a too-short JWT secret', () => {
    const env = validEnv();
    env['PORT'] = '70000';
    env['JWT_ACCESS_SECRET'] = 'short';

    expect(() => loadConfig(env)).toThrow(EnvValidationError);
  });

  it('rejects an unsupported locale', () => {
    const env = validEnv();
    env['DEFAULT_LOCALE'] = 'fr';

    expect(() => loadConfig(env)).toThrow(EnvValidationError);
  });

  it('exposes a stable APP_CONFIG DI token', () => {
    expect(typeof APP_CONFIG).toBe('symbol');
    expect(APP_CONFIG.toString()).toContain('AppConfig');
  });
});
