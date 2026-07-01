// libs/testing/src/fakes/fakes.spec.ts
import { FakeClockPort } from './fake-clock.port';
import { FakeIdGeneratorPort } from './fake-id-generator.port';
import { FakePredictionModelPort } from './fake-prediction-model.port';
import { FakeCache } from './fake-cache';
import { FakeAuditLog } from './fake-audit-log';
import { FakeEventBus } from './fake-event-bus';
import { FakeI18nPort } from './fake-i18n.port';
import { FakeLlmExplanationPort } from './fake-llm-explanation.port';
import { FakeOddsRepository } from './fake-odds-repository';
import { aModelScoreResult } from '../mothers/model-score.mother';
import { anExplanationRequest } from '../mothers/explanation.mother';
import type { AuditEntry, DomainEvent, MatchId, MarketKey } from '@betvision/domain';

describe('deterministic fakes', () => {
  it('FakeClockPort is fixed and advanceable', () => {
    const clock = new FakeClockPort();
    expect(clock.now()).toBe('2026-01-01T00:00:00.000Z');
    clock.advance(1000);
    expect(clock.now()).toBe('2026-01-01T00:00:01.000Z');
  });

  it('FakeIdGeneratorPort counts up deterministically', () => {
    const ids = new FakeIdGeneratorPort();
    expect(ids.newId()).toBe('id-1');
    expect(ids.newId()).toBe('id-2');
    ids.reset();
    expect(ids.newId()).toBe('id-1');
  });

  it('FakePredictionModelPort returns canned probs and records requests', async () => {
    const model = new FakePredictionModelPort().seed(aModelScoreResult());
    const result = await model.score({
      matchId: 'm1' as MatchId,
      features: { matchId: 'm1' as MatchId, version: 'v1', features: {}, snapshotHash: 'h' },
      markets: ['1X2' as MarketKey],
    });
    expect(result.modelVersion).toBe('test-model-1');
    expect(model.calls).toHaveLength(1);
  });

  it('FakePredictionModelPort throws until seeded', async () => {
    const model = new FakePredictionModelPort();
    await expect(
      model.score({
        matchId: 'm1' as MatchId,
        features: { matchId: 'm1' as MatchId, version: 'v1', features: {}, snapshotHash: 'h' },
        markets: [],
      }),
    ).rejects.toThrow('not seeded');
  });

  it('FakeCache stores, reads and records sets', async () => {
    const cache = new FakeCache();
    expect(await cache.get('k')).toBeNull();
    await cache.set('k', { a: 1 }, 60);
    expect(await cache.get<{ a: number }>('k')).toEqual({ a: 1 });
    expect(cache.sets[0]).toMatchObject({ key: 'k', ttlSeconds: 60 });
    await cache.delete('k');
    expect(await cache.get('k')).toBeNull();
  });

  it('FakeAuditLog records entries', async () => {
    const audit = new FakeAuditLog();
    const entry: AuditEntry = {
      actorId: null,
      action: 'x',
      entity: 'E',
      entityId: '1',
      occurredAt: '2026-01-01T00:00:00.000Z',
    };
    await audit.record(entry);
    expect(audit.entries).toEqual([entry]);
  });

  it('FakeEventBus captures published events', async () => {
    const bus = new FakeEventBus();
    const evt: DomainEvent = {
      name: 'PredictionReady',
      occurredAt: '2026-01-01T00:00:00.000Z',
      payload: {},
    };
    await bus.publish(evt);
    await bus.publishAll([evt, evt]);
    expect(bus.published).toHaveLength(3);
  });

  it('FakeI18nPort echoes the code (passthrough)', () => {
    const i18n = new FakeI18nPort();
    expect(i18n.resolve('domain.vo.odds_not_greater_than_one', {}, 'es')).toBe(
      '[es] domain.vo.odds_not_greater_than_one',
    );
  });

  it('FakeLlmExplanationPort echoes facts as prose and NEVER invents numbers', async () => {
    const llm = new FakeLlmExplanationPort();
    const request = anExplanationRequest();
    const narrative = await llm.explain(request);
    // Every field is a string; there are no numeric probability/edge/EV fields at all.
    expect(typeof narrative.summary).toBe('string');
    expect(narrative.responsibleGamblingWarning).toContain('variance');
    expect(narrative.citations).toEqual(request.sources);
    expect(llm.requests).toHaveLength(1);
  });

  it('FakeOddsRepository returns the latest snapshot per selection', async () => {
    const repo = new FakeOddsRepository();
    const matchId = 'm1' as MatchId;
    await repo.saveSnapshots([
      { matchId, bookmaker: 'b', market: '1X2' as MarketKey, selection: 'HOME', priceDecimal: 2.0, capturedAt: '2026-01-01T10:00:00.000Z' },
      { matchId, bookmaker: 'b', market: '1X2' as MarketKey, selection: 'HOME', priceDecimal: 2.1, capturedAt: '2026-01-01T11:00:00.000Z' },
    ]);
    const latest = await repo.findLatest(matchId);
    expect(latest).toHaveLength(1);
    expect(latest[0].priceDecimal).toBe(2.1);
  });
});
