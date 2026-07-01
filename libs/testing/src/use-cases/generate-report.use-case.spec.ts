// Phase-12 GenerateReportUseCase / GetReportUseCase wired against the SHARED libs/testing fakes +
// the REAL pure narrator/guardrail. Proves (all deterministic, no DB, no network):
//   • a report renders in EN and ES from BYTE-IDENTICAL numbers, with different-language prose,
//   • the guardrail REJECTS a contradicting narrative and the templated fallback is used instead,
//   • the report records the riskAppetite/bucket that produced its recommendations,
//   • GET returns the immutable report; an unknown id yields REPORT_NOT_FOUND.
import {
  GenerateReportUseCase,
  GetReportUseCase,
  renderTemplateNarrative,
} from '@betvision/application';
import { DomainErrorCode } from '@betvision/shared';
import {
  RecommendationRationale,
  RiskBucket,
  ConfidenceLevel,
  RiskLevel,
  type ExplanationRequest,
  type ExplanationNarrative,
  type LlmExplanationPort,
  type PredictionRecord,
  type PredictionResultRecord,
  type RecommendationRecord,
  type PredictionId,
  type MatchId,
  type MarketKey,
  type ReportId,
} from '@betvision/domain';
import { FakePredictionRepository } from '../fakes/fake-prediction-repository';
import { FakePredictionResultRepository } from '../fakes/fake-prediction-result-repository';
import { FakeRecommendationRepository } from '../fakes/fake-recommendation-repository';
import { FakeMatchRepository } from '../fakes/fake-match-repository';
import { FakeRagRetriever } from '../fakes/fake-rag-retriever';
import { FakeAnalysisReportRepository } from '../fakes/fake-analysis-report-repository';
import { FakeCache } from '../fakes/fake-cache';
import { FakeClockPort } from '../fakes/fake-clock.port';
import { FakeIdGeneratorPort } from '../fakes/fake-id-generator.port';

const PREDICTION_ID = 'pred-1' as PredictionId;
const MATCH_ID = 'match-1' as MatchId;
const APPETITE = 85;

const prediction: PredictionRecord = {
  id: PREDICTION_ID,
  matchId: MATCH_ID,
  modelVersion: 'stat-v1',
  inputSnapshotHash: 'hash-abc',
};

const results: PredictionResultRecord[] = [
  {
    predictionId: PREDICTION_ID,
    market: '1X2' as MarketKey,
    selection: 'HOME',
    modelProbability: 0.57,
    confidence: ConfidenceLevel.High,
    risk: RiskLevel.Low,
    impliedProbability: 0.51,
    edge: 0.06,
    expectedValue: 0.12,
    suggestedStakePct: 0.015,
  },
  {
    predictionId: PREDICTION_ID,
    market: 'OU_2_5' as MarketKey,
    selection: 'OVER',
    modelProbability: 0.62,
    confidence: ConfidenceLevel.Medium,
    risk: RiskLevel.Medium,
    impliedProbability: 0.54,
    edge: 0.08,
    expectedValue: 0.15,
    suggestedStakePct: 0.02,
  },
];

const recommendations: RecommendationRecord[] = [
  {
    predictionId: PREDICTION_ID,
    market: '1X2' as MarketKey,
    selection: 'HOME',
    rationale: RecommendationRationale.PositiveEdgeBestBet,
    confidence: ConfidenceLevel.High,
    risk: RiskLevel.Low,
    isBestBet: true,
    riskAppetite: APPETITE,
    riskBucket: RiskBucket.Aggressive,
  },
  {
    predictionId: PREDICTION_ID,
    market: 'OU_2_5' as MarketKey,
    selection: 'OVER',
    rationale: RecommendationRationale.PositiveEdgeAlternative,
    confidence: ConfidenceLevel.Medium,
    risk: RiskLevel.Medium,
    isBestBet: false,
    riskAppetite: APPETITE,
    riskBucket: RiskBucket.Aggressive,
  },
];

/** A narrator that delegates to the deterministic, guardrail-valid template renderer. */
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

function makeDeps(narrator: LlmExplanationPort) {
  const predictionsRepo = new FakePredictionRepository();
  void predictionsRepo.save(prediction);
  const predictionResults = new FakePredictionResultRepository();
  void predictionResults.saveMany(results);
  const recommendationsRepo = new FakeRecommendationRepository();
  void recommendationsRepo.replaceForPrediction(PREDICTION_ID, APPETITE, recommendations);

  return {
    predictions: predictionsRepo,
    predictionResults,
    recommendations: recommendationsRepo,
    matches: new FakeMatchRepository(),
    rag: new FakeRagRetriever().seed([
      { text: 'Synthetic dev snippet.', score: 0.9, source: { label: 'Dev source', provider: 'dev-rag-stub' } },
    ]),
    narrator,
    reports: new FakeAnalysisReportRepository(),
    cache: new FakeCache(),
    clock: new FakeClockPort(),
    ids: new FakeIdGeneratorPort('report'),
  };
}

/** JSON of the numeric-only fields — used to prove EN and ES share byte-identical numbers. */
const numbersOf = (
  markets: ReadonlyArray<{
    market: string;
    selection: string;
    modelProbability: number;
    impliedProbability: number | null;
    edge: number | null;
    expectedValue: number | null;
    suggestedStakePct: number | null;
  }>,
): string =>
  JSON.stringify(
    [...markets]
      .sort((a, b) => `${a.market}${a.selection}`.localeCompare(`${b.market}${b.selection}`))
      .map((m) => ({
        k: `${m.market}:${m.selection}`,
        modelProbability: m.modelProbability,
        impliedProbability: m.impliedProbability,
        edge: m.edge,
        expectedValue: m.expectedValue,
        suggestedStakePct: m.suggestedStakePct,
      })),
  );

describe('GenerateReportUseCase (wired with libs/testing fakes + real narrator/guardrail)', () => {
  it('renders EN and ES from BYTE-IDENTICAL numbers with different-language prose', async () => {
    const deps = makeDeps(templateNarrator);
    const useCase = new GenerateReportUseCase(deps);

    const en = await useCase.execute({ predictionId: PREDICTION_ID, language: 'en' });
    const es = await useCase.execute({ predictionId: PREDICTION_ID, language: 'es' });
    if (!en.ok || !es.ok) throw new Error('expected ok');

    // No fallback needed — the template narration passes the guardrail on the first attempt.
    expect(en.value.usedFallback).toBe(false);
    expect(es.value.usedFallback).toBe(false);
    expect(en.value.attempts).toBe(1);

    // Different-language prose.
    expect(en.value.report.language).toBe('en');
    expect(es.value.report.language).toBe('es');
    expect(en.value.report.content.summary).not.toBe(es.value.report.content.summary);

    // Byte-identical numbers across languages (recommendations + full prediction set + best bet).
    expect(numbersOf(es.value.report.content.recommendedMarkets)).toBe(
      numbersOf(en.value.report.content.recommendedMarkets),
    );
    expect(numbersOf(es.value.report.content.predictions)).toBe(
      numbersOf(en.value.report.content.predictions),
    );
    expect(JSON.stringify(es.value.report.content.bestBet)).toBe(
      JSON.stringify(en.value.report.content.bestBet),
    );

    // Sources cited; RG warning present in each language.
    expect(en.value.report.sources.length).toBeGreaterThan(0);
    expect(en.value.report.content.responsibleGamblingWarning).toMatch(/responsibl/i);
    expect(es.value.report.content.responsibleGamblingWarning).toMatch(/responsab/i);
  });

  it('records the riskAppetite/bucket that produced its recommendations', async () => {
    const deps = makeDeps(templateNarrator);
    const result = await new GenerateReportUseCase(deps).execute({
      predictionId: PREDICTION_ID,
      language: 'en',
    });
    if (!result.ok) throw new Error('expected ok');

    expect(result.value.report.riskAppetite).toBe(APPETITE);
    expect(result.value.report.riskBucket).toBe(RiskBucket.Aggressive);
    // Persisted immutably.
    expect(deps.reports.saved).toHaveLength(1);
    expect(deps.reports.saved[0].riskAppetite).toBe(APPETITE);
    expect(deps.reports.saved[0].riskBucket).toBe(RiskBucket.Aggressive);
  });

  it('GUARDRAIL rejects a contradicting narrative → regenerate once → templated fallback used', async () => {
    const deps = makeDeps(badNarrator);
    const result = await new GenerateReportUseCase(deps).execute({
      predictionId: PREDICTION_ID,
      language: 'en',
    });
    if (!result.ok) throw new Error('expected ok');

    // Two rejected live attempts, then the deterministic template fallback.
    expect(result.value.usedFallback).toBe(true);
    expect(result.value.attempts).toBe(2);
    expect(result.value.guardrailViolations.length).toBeGreaterThan(0);
    expect(result.value.guardrailViolations.map((v) => v.code)).toContain(
      'guardrail.numeric_contradiction',
    );

    // The stored narrative is the templated one, NOT the fabricated "99.0%" claim.
    expect(result.value.report.content.summary).not.toContain('99.0%');
    expect(result.value.report.content.summary).toContain('strongest model-identified value');
  });

  it('returns PREDICTION_NOT_FOUND for an unknown prediction', async () => {
    const deps = makeDeps(templateNarrator);
    const result = await new GenerateReportUseCase(deps).execute({
      predictionId: 'nope' as PredictionId,
      language: 'en',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(DomainErrorCode.PREDICTION_NOT_FOUND);
  });
});

describe('GetReportUseCase (wired with libs/testing fakes)', () => {
  it('returns the immutable report by id (cache read-through)', async () => {
    const deps = makeDeps(templateNarrator);
    const generated = await new GenerateReportUseCase(deps).execute({
      predictionId: PREDICTION_ID,
      language: 'en',
    });
    if (!generated.ok) throw new Error('expected ok');
    const id = generated.value.report.id;

    const get = new GetReportUseCase({ reports: deps.reports, cache: deps.cache });
    const found = await get.execute({ reportId: id });
    if (!found.ok) throw new Error('expected ok');
    expect(found.value.id).toBe(id);
    expect(found.value.predictionId).toBe(PREDICTION_ID);
  });

  it('returns REPORT_NOT_FOUND for an unknown id', async () => {
    const deps = makeDeps(templateNarrator);
    const get = new GetReportUseCase({ reports: deps.reports, cache: deps.cache });
    const found = await get.execute({ reportId: 'missing' as ReportId });
    expect(found.ok).toBe(false);
    if (!found.ok) expect(found.error.code).toBe(DomainErrorCode.REPORT_NOT_FOUND);
  });
});
