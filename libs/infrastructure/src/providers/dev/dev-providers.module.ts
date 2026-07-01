// libs/infrastructure/src/providers/dev/dev-providers.module.ts
// @Global binding of the SYNTHETIC DEV provider adapters to their DOMAIN port tokens, GATED on
// `AppConfig.dataSourceMode`. When `dev` (default), the deterministic synthetic adapters are bound;
// when `live`, they refuse to bind (throwing a clear error) until the real Phase-7 adapters exist.
// Use cases depend only on the port tokens, so swapping dev -> live is a config change, not a code
// change at the call sites.
import { Global, Module } from '@nestjs/common';
import {
  SPORTS_DATA_PROVIDER,
  ODDS_PROVIDER,
  TEAM_STATS_PROVIDER,
  PLAYER_STATS_PROVIDER,
} from '@betvision/domain';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import { DevSportsDataProvider } from './dev-sports-data.provider';
import { DevTeamStatsProvider } from './dev-team-stats.provider';
import { DevPlayerStatsProvider } from './dev-player-stats.provider';
import { DevOddsProvider } from './dev-odds.provider';

function requireDevMode<T>(config: AppConfig, capability: string, make: () => T): T {
  if (config.dataSourceMode !== 'dev') {
    throw new Error(
      `No live adapter bound for ${capability}. Set DATA_SOURCE_MODE=dev to use the ` +
        `synthetic dev adapter, or implement the Phase-7 live adapter.`,
    );
  }
  return make();
}

@Global()
@Module({
  providers: [
    {
      provide: SPORTS_DATA_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        requireDevMode(config, 'SportsDataProvider', () => new DevSportsDataProvider()),
    },
    {
      provide: TEAM_STATS_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        requireDevMode(config, 'TeamStatsProvider', () => new DevTeamStatsProvider()),
    },
    {
      provide: PLAYER_STATS_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        requireDevMode(config, 'PlayerStatsProvider', () => new DevPlayerStatsProvider()),
    },
    {
      provide: ODDS_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        requireDevMode(config, 'OddsProvider', () => new DevOddsProvider()),
    },
  ],
  exports: [SPORTS_DATA_PROVIDER, TEAM_STATS_PROVIDER, PLAYER_STATS_PROVIDER, ODDS_PROVIDER],
})
export class DevProvidersModule {}
