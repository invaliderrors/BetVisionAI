// libs/testing/src/use-cases/resolve-risk-profile.use-case.spec.ts
// Proves the sample application use case runs against the SHARED libs/testing fakes with
// zero IO. `libs/testing` is the only layer allowed to depend on BOTH `@betvision/application`
// and its own fakes, so this cross-layer wiring test lives here (no boundary violation).
import { ResolveRiskProfileUseCase } from '@betvision/application';
import { DefaultRiskProfileService, RiskBucket, MarketGroup } from '@betvision/domain';
import { FakeClockPort } from '../fakes/fake-clock.port';
import { FakeIdGeneratorPort } from '../fakes/fake-id-generator.port';
import { FakeAuditLog } from '../fakes/fake-audit-log';

const makeUseCase = () => {
  const clock = new FakeClockPort();
  const ids = new FakeIdGeneratorPort();
  const audit = new FakeAuditLog();
  const useCase = new ResolveRiskProfileUseCase(
    new DefaultRiskProfileService(),
    clock,
    ids,
    audit,
  );
  return { useCase, clock, ids, audit };
};

describe('ResolveRiskProfileUseCase wired with libs/testing fakes', () => {
  it('produces a deterministic result and records an audit entry', async () => {
    const { useCase, audit } = makeUseCase();
    const result = await useCase.execute({ riskAppetite: 50 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('id-1'); // FakeIdGeneratorPort counter
      expect(result.value.resolvedAt).toBe('2026-01-01T00:00:00.000Z'); // FakeClockPort fixed
      expect(result.value.bucket).toBe(RiskBucket.Balanced);
    }
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0].occurredAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('same fixture at risk 10 vs 90 yields different profiles (selection, not truth)', async () => {
    const conservative = await makeUseCase().useCase.execute({ riskAppetite: 10 });
    const aggressive = await makeUseCase().useCase.execute({ riskAppetite: 90 });

    if (conservative.ok && aggressive.ok) {
      expect(conservative.value.bucket).toBe(RiskBucket.Conservative);
      expect(aggressive.value.bucket).toBe(RiskBucket.Aggressive);
      expect(conservative.value.profile.minEdge).toBeGreaterThan(
        aggressive.value.profile.minEdge,
      );
      expect(conservative.value.profile.allowedMarketGroups).not.toContain(MarketGroup.Specials);
      expect(aggressive.value.profile.allowedMarketGroups).toContain(MarketGroup.Specials);
    } else {
      throw new Error('expected both ok');
    }
  });

  it('advancing the fake clock changes the resolved timestamp', async () => {
    const clock = new FakeClockPort();
    const useCase = new ResolveRiskProfileUseCase(
      new DefaultRiskProfileService(),
      clock,
      new FakeIdGeneratorPort(),
      new FakeAuditLog(),
    );
    clock.advance(60_000);
    const result = await useCase.execute({ riskAppetite: 33 });
    if (result.ok) expect(result.value.resolvedAt).toBe('2026-01-01T00:01:00.000Z');
  });
});
