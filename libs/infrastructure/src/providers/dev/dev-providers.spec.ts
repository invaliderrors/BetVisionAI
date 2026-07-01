// libs/infrastructure/src/providers/dev/dev-providers.spec.ts
// Contract-style tests for the SYNTHETIC DEV adapters: DETERMINISM (same id -> same output across
// calls), provenance stamping (DEV_SYNTHETIC), and the odds > 1.0 invariant.
import type { TeamId, PlayerId, MatchId, SeasonId, MarketKey } from '@betvision/domain';
import { DEV_SYNTHETIC } from './dev-synthetic';
import { DevSportsDataProvider } from './dev-sports-data.provider';
import { DevTeamStatsProvider } from './dev-team-stats.provider';
import { DevPlayerStatsProvider } from './dev-player-stats.provider';
import { DevOddsProvider } from './dev-odds.provider';

const HOME = 'dev-team-alpha' as TeamId;
const AWAY = 'dev-team-bravo' as TeamId;

describe('DevSportsDataProvider (synthetic, deterministic)', () => {
  const provider = new DevSportsDataProvider();

  it('returns identical form for the same team across calls, and stamps DEV_SYNTHETIC', async () => {
    const a = await provider.getTeamForm(HOME, 5);
    const b = await provider.getTeamForm(HOME, 5);
    expect(a.data).toEqual(b.data);
    expect(a.data.results).toHaveLength(5);
    expect(a.provenance.provider).toBe(DEV_SYNTHETIC);
    expect(a.provenance.payloadHash).toBe(b.provenance.payloadHash);
  });

  it('yields different synthetic form for different teams', async () => {
    const alpha = await provider.getTeamForm(HOME, 5);
    const bravo = await provider.getTeamForm(AWAY, 5);
    expect(alpha.data).not.toEqual(bravo.data);
  });

  it('produces deterministic head-to-head with only PAST meeting dates', async () => {
    const a = await provider.getHeadToHead(HOME, AWAY);
    const b = await provider.getHeadToHead(HOME, AWAY);
    expect(a.data).toEqual(b.data);
    expect(a.data.meetings.length).toBeGreaterThan(0);
    for (const m of a.data.meetings) {
      expect(Date.parse(m.kickoffUtc)).toBeLessThan(Date.parse('2026-01-01T00:00:00.000Z'));
    }
  });
});

describe('DevTeamStatsProvider (synthetic, deterministic)', () => {
  const provider = new DevTeamStatsProvider();

  it('is deterministic per (teamId, venue, window) and stamps DEV_SYNTHETIC', async () => {
    const a = await provider.getTeamStats(HOME, { venue: 'home', window: 5 });
    const b = await provider.getTeamStats(HOME, { venue: 'home', window: 5 });
    expect(a.data).toEqual(b.data);
    expect(a.provenance.provider).toBe(DEV_SYNTHETIC);
    expect(a.data.avgGoalsFor).toBeGreaterThan(0);
  });

  it('varies by scope venue', async () => {
    const home = await provider.getTeamStats(HOME, { venue: 'home', window: 5 });
    const away = await provider.getTeamStats(HOME, { venue: 'away', window: 5 });
    expect(home.data).not.toEqual(away.data);
  });
});

describe('DevPlayerStatsProvider (synthetic, deterministic)', () => {
  const provider = new DevPlayerStatsProvider();

  it('is deterministic per (playerId, season)', async () => {
    const player = 'dev-player-1' as PlayerId;
    const season = 'dev-season-synthetic' as SeasonId;
    const a = await provider.getPlayerStats(player, season);
    const b = await provider.getPlayerStats(player, season);
    expect(a.data).toEqual(b.data);
    expect(a.provenance.provider).toBe(DEV_SYNTHETIC);
    expect(a.data.minutes).toBeGreaterThanOrEqual(0);
  });
});

describe('DevOddsProvider (synthetic, deterministic)', () => {
  const provider = new DevOddsProvider();
  const matchId = 'dev-match-1' as MatchId;

  it('is deterministic and every synthetic price is > 1.0', async () => {
    const a = await provider.getOdds({ matchId });
    const b = await provider.getOdds({ matchId });
    expect(a.data).toEqual(b.data);
    expect(a.data.length).toBeGreaterThan(0);
    expect(a.provenance.provider).toBe(DEV_SYNTHETIC);
    for (const snap of a.data) expect(snap.priceDecimal).toBeGreaterThan(1.0);
  });

  it('restricts to the requested markets', async () => {
    const only = await provider.getOdds({ matchId, markets: ['1X2' as MarketKey] });
    expect(new Set(only.data.map((s) => s.market))).toEqual(new Set(['1X2']));
    expect(only.data.map((s) => s.selection).sort()).toEqual(['AWAY', 'DRAW', 'HOME']);
  });
});
