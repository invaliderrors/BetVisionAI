// libs/testing/src/use-cases/analyze-fixture.use-case.spec.ts
// Hermetic AnalyzeFixtureUseCase — canned FixtureResearchProvider + the REAL domain statistical
// model + REAL risk/value/kelly services + REAL narrator/guardrail. No network, no DB. Proves:
//   • a free-text query yields a Match + features + prediction + recommendations + a report,
//   • risk=10 vs risk=90 differ (bucket + surfaced selections) while the model probabilities are
//     BYTE-IDENTICAL (the risk-appetite guardrail — risk shapes selection, never truth),
//   • every result carries the AI-ESTIMATED-inputs disclaimer + provenance LLM_RESEARCH,
//   • the Phase-12 guardrail still rejects a contradicting narrative (templated fallback is used),
//   • a research-provider failure surfaces as FIXTURE_RESEARCH_FAILED.
import { AnalyzeFixtureUseCase, renderTemplateNarrative } from '@betvision/application';
import { DomainErrorCode } from '@betvision/shared';
import {
  DefaultRiskProfileService,
  DefaultValueCalculator,
  DefaultKellyStakeService,
  RiskBucket,
  LLM_RESEARCH_PROVENANCE,
  STATISTICAL_MARKETS,
  type ExplanationRequest,
  type ExplanationNarrative,
  type LlmExplanationPort,
  type FixtureResearchPort,
} from '@betvision/domain';
import {
  FakeFixtureResearchProvider,
  ThrowingFixtureResearchProvider,
} from '../fakes/fake-fixture-research-provider';
import { FakeRagRetriever } from '../fakes/fake-rag-retriever';
import { FakeClockPort } from '../fakes/fake-clock.port';
import { FakeIdGeneratorPort } from '../fakes/fake-id-generator.port';
import { DomainStatisticalModel } from '../mothers/model-score.mother';

const templateNarrator: LlmExplanationPort = {
  async explain(request: ExplanationRequest): Promise<ExplanationNarrative> {
    return renderTemplateNarrative(request);
  },
};

/** A narrator that fabricates a contradicting probability — always fails the guardrail. */
const badNarrator: LlmExplanationPort = {
  async explain(request: ExplanationRequest): Promise<ExplanationNarrative> {
    return {
      language: request.language,
      summary: 'This selection has a 99.0% chance — an essentially guaranteed winner.',
      recentForm: 'Recent form and context.',
      risks: 'Some generic risk note.',
      keyVariables: 'market',
      reasoning: 'Because the number says so.',
      marketRationale: 'A confident pick.',
      responsibleGamblingWarning: 'Bet responsibly.',
      citations: request.sources,
    };
  },
};

function makeDeps(
  narrator: LlmExplanationPort = templateNarrator,
  research: FixtureResearchPort = new FakeFixtureResearchProvider(),
) {
  return {
    research,
    model: new DomainStatisticalModel(),
    riskProfiles: new DefaultRiskProfileService(),
    valueCalculator: new DefaultValueCalculator(),
    kelly: new DefaultKellyStakeService(),
    rag: new FakeRagRetriever().seed([
      { text: 'Preview snippet.', score: 0.9, source: { label: 'Preview', provider: 'dev-rag-stub' } },
    ]),
    narrator,
    clock: new FakeClockPort(),
    ids: new FakeIdGeneratorPort('an'),
  };
}

describe('AnalyzeFixtureUseCase (hermetic: canned research + real model/services/narrator)', () => {
  it('produces a Match + features + prediction + recommendations + report for a free-text query', async () => {
    const result = await new AnalyzeFixtureUseCase(makeDeps()).execute({
      query: 'Portugal vs Spain',
      riskAppetite: 50,
      language: 'en',
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
    const r = result.value;

    // Resolved fixture from the free text.
    expect(r.fixture.home.name).toBe('Portugal');
    expect(r.fixture.away.name).toBe('Spain');

    // Features → objective prediction (13 selections: 1X2 + OU×4 + BTTS) with a reproducibility hash.
    expect(r.run.inputSnapshotHash.length).toBeGreaterThan(0);
    const markets = new Set(r.run.results.map((x) => x.market));
    expect([...markets].sort()).toEqual([...STATISTICAL_MARKETS].sort());
    expect(r.detect.results.length).toBe(13);

    // A bilingual report was assembled, and it carries the responsible-gambling warning.
    expect(r.report.report.language).toBe('en');
    expect(r.report.report.content.responsibleGamblingWarning).toMatch(/responsibl/i);

    // AI-ESTIMATED disclaimer + provenance are always present.
    expect(r.provenance).toBe(LLM_RESEARCH_PROVENANCE);
    expect(r.aiEstimatedInputs).toBe(true);
    expect(r.disclaimer).toMatch(/ESTIMATED/);
    expect(r.disclaimer).toMatch(/LLM_RESEARCH/);
    // Research-sourced citations flow through to the result (provider LLM_RESEARCH).
    expect(r.sources.some((s) => s.provider === LLM_RESEARCH_PROVENANCE)).toBe(true);
  });

  it('risk=10 vs risk=90 differ, but the model probabilities are BYTE-IDENTICAL', async () => {
    const deps = makeDeps();
    const useCase = new AnalyzeFixtureUseCase(deps);

    const low = await useCase.execute({ query: 'Portugal vs Spain', riskAppetite: 10, language: 'en' });
    const high = await useCase.execute({ query: 'Portugal vs Spain', riskAppetite: 90, language: 'en' });
    if (!low.ok || !high.ok) throw new Error('expected ok');

    // Same objective probabilities regardless of appetite (risk shapes SELECTION, not TRUTH).
    const probs = (x: typeof low.value) =>
      JSON.stringify(
        [...x.detect.results]
          .sort((a, b) => `${a.market}${a.selection}`.localeCompare(`${b.market}${b.selection}`))
          .map((m) => `${m.market}:${m.selection}=${m.modelProbability}`),
      );
    expect(probs(high.value)).toBe(probs(low.value));

    // But the RESOLVED risk profile + surfaced selections differ: the strict conservative gate
    // surfaces fewer selections and stakes less than the aggressive one.
    expect(low.value.detect.riskBucket).toBe(RiskBucket.Conservative);
    expect(high.value.detect.riskBucket).toBe(RiskBucket.Aggressive);
    expect(low.value.detect.recommendations.length).toBeGreaterThan(0);
    expect(high.value.detect.recommendations.length).toBeGreaterThan(
      low.value.detect.recommendations.length,
    );
    expect(JSON.stringify(high.value.detect.recommendations)).not.toBe(
      JSON.stringify(low.value.detect.recommendations),
    );
  });

  it('GUARDRAIL still rejects a contradicting narrative → templated fallback used', async () => {
    const result = await new AnalyzeFixtureUseCase(makeDeps(badNarrator)).execute({
      query: 'Portugal vs Spain',
      riskAppetite: 90,
      language: 'en',
    });
    if (!result.ok) throw new Error('expected ok');

    expect(result.value.report.usedFallback).toBe(true);
    expect(result.value.report.guardrailViolations.map((v) => v.code)).toContain(
      'guardrail.numeric_contradiction',
    );
    expect(result.value.report.report.content.summary).not.toContain('99.0%');
  });

  it('surfaces FIXTURE_RESEARCH_FAILED when the research provider throws', async () => {
    const result = await new AnalyzeFixtureUseCase(
      makeDeps(templateNarrator, new ThrowingFixtureResearchProvider()),
    ).execute({ query: 'Portugal vs Spain' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(DomainErrorCode.FIXTURE_RESEARCH_FAILED);
  });

  it('rejects an empty query', async () => {
    const result = await new AnalyzeFixtureUseCase(makeDeps()).execute({ query: '   ' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(DomainErrorCode.FIXTURE_QUERY_EMPTY);
  });
});
