import { ResolveRiskProfileUseCase } from './resolve-risk-profile.use-case';
import {
  DefaultRiskProfileService,
  RiskBucket,
  MarketGroup,
  type ClockPort,
  type IdGeneratorPort,
  type AuditLogPort,
  type AuditEntry,
  type IsoDateTime,
} from '@betvision/domain';

// Inline fakes implementing domain port interfaces keep this lib's tests dependency-free
// (application → domain/shared only). The shared libs/testing fakes are exercised against
// this same use case from libs/testing (which is allowed to depend on application).
class StubClock implements ClockPort {
  now(): IsoDateTime {
    return '2026-01-01T00:00:00.000Z';
  }
  epochMillis(): number {
    return Date.parse(this.now());
  }
}

class StubIds implements IdGeneratorPort {
  private n = 0;
  newId(): string {
    return `id-${++this.n}`;
  }
}

class RecordingAudit implements AuditLogPort {
  readonly entries: AuditEntry[] = [];
  async record(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }
}

const makeUseCase = () => {
  const audit = new RecordingAudit();
  const useCase = new ResolveRiskProfileUseCase(
    new DefaultRiskProfileService(),
    new StubClock(),
    new StubIds(),
    audit,
  );
  return { useCase, audit };
};

describe('ResolveRiskProfileUseCase', () => {
  it('resolves a conservative profile with deterministic id + time (zero IO)', async () => {
    const { useCase, audit } = makeUseCase();
    const result = await useCase.execute({ riskAppetite: 10 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('id-1');
      expect(result.value.resolvedAt).toBe('2026-01-01T00:00:00.000Z');
      expect(result.value.appetite).toBe(10);
      expect(result.value.bucket).toBe(RiskBucket.Conservative);
      expect(result.value.profile.allowedMarketGroups).not.toContain(MarketGroup.Specials);
    }
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      action: 'risk_profile.resolved',
      entity: 'RiskProfile',
      entityId: 'id-1',
    });
  });

  it('resolves an aggressive profile that unlocks Specials', async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute({ riskAppetite: 90 });

    if (result.ok) {
      expect(result.value.bucket).toBe(RiskBucket.Aggressive);
      expect(result.value.profile.allowedMarketGroups).toContain(MarketGroup.Specials);
    } else {
      throw new Error('expected ok');
    }
  });

  it('returns a DomainError for an out-of-range appetite and writes NO audit entry', async () => {
    const { useCase, audit } = makeUseCase();
    const result = await useCase.execute({ riskAppetite: 150 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('domain.vo.risk_appetite_out_of_range');
    expect(audit.entries).toHaveLength(0);
  });

  it('rejects a non-integer appetite', async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute({ riskAppetite: 33.5 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('domain.vo.risk_appetite_not_integer');
  });
});
