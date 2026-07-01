// libs/application/src/reports/generate-report.use-case.ts
// Phase 12 — GenerateReportUseCase. Assembles an immutable, bilingual AnalysisReport AROUND the
// persisted numbers (Phase 10/11):
//
//   load Prediction + PredictionResult[] + Recommendation[]  (the ONLY source of numbers)
//     → retrieve cited sources (RAG)
//     → call the LlmExplanationPort with ONLY {numbers, sources, language}  (strings-only return)
//     → GUARDRAIL: assert the prose does not contradict the numbers, includes the RG warning,
//       cites sources, and is in the requested language.  On failure: regenerate ONCE, then fall
//       back to the fully-templated (deterministic, guardrail-valid) narrative.
//     → assemble the report (numbers copied verbatim), cache in Redis + persist in Postgres.
//
// GUARDRAIL (non-negotiable): probabilities/edges/EV/stakes come ONLY from the persisted records.
// The LLM EXPLAINS; it never produces or alters a number. Re-rendering the SAME prediction in the
// other language reuses these SAME numbers — only the prose changes.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import {
  validateNarrative,
  GuardrailCode,
  RiskBucket,
  type LlmExplanationPort,
  type RagRetrieverPort,
  type AnalysisReportRepositoryPort,
  type AnalysisReportRecord,
  type AnalysisReportContent,
  type ReportSelectionView,
  type ComputedSelectionFact,
  type ExplanationRequest,
  type ExplanationNarrative,
  type GuardrailViolation,
  type SourceRef,
  type PredictionRepositoryPort,
  type PredictionResultRepositoryPort,
  type RecommendationRepositoryPort,
  type MatchRepositoryPort,
  type PredictionResultRecord,
  type RecommendationRecord,
  type CachePort,
  type ClockPort,
  type IdGeneratorPort,
  type Locale,
  type PredictionId,
  type ReportId,
} from '@betvision/domain';
import { renderTemplateNarrative } from './template-narrative';

const CACHE_TTL_SECONDS = 3600;
const MAX_LLM_ATTEMPTS = 2;

export interface GenerateReportCommand {
  readonly predictionId: PredictionId;
  readonly language: Locale;
}

export interface GenerateReportResult {
  readonly report: AnalysisReportRecord;
  /** True when the guardrail rejected every live attempt and the templated fallback was used. */
  readonly usedFallback: boolean;
  /** Number of primary-narrator attempts made (0 when the fallback ran without a usable attempt). */
  readonly attempts: number;
  /** Guardrail violations from the LAST rejected attempt (empty when a narration passed). */
  readonly guardrailViolations: ReadonlyArray<GuardrailViolation>;
}

export interface GenerateReportDeps {
  readonly predictions: PredictionRepositoryPort;
  readonly predictionResults: PredictionResultRepositoryPort;
  readonly recommendations: RecommendationRepositoryPort;
  readonly matches: MatchRepositoryPort;
  readonly rag: RagRetrieverPort;
  readonly narrator: LlmExplanationPort;
  readonly reports: AnalysisReportRepositoryPort;
  readonly cache: CachePort;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
}

const fixed = (n: number, d: number): string => n.toFixed(d);
const pct1 = (n: number): string => `${fixed(n, 1)}%`;
const signedPct1 = (n: number): string => `${n >= 0 ? '+' : ''}${fixed(n, 1)}%`;

export function reportCacheKey(predictionId: string, language: Locale): string {
  return `report:${predictionId}:${language}`;
}
export function reportIdCacheKey(id: string): string {
  return `report:id:${id}`;
}

export class GenerateReportUseCase {
  constructor(private readonly deps: GenerateReportDeps) {}

  async execute(
    command: GenerateReportCommand,
  ): Promise<Result<GenerateReportResult, DomainError>> {
    const prediction = await this.deps.predictions.findById(command.predictionId);
    if (!prediction) {
      return err(
        DomainError.of(DomainErrorCode.PREDICTION_NOT_FOUND, {
          predictionId: command.predictionId,
        }),
      );
    }

    const results = await this.deps.predictionResults.findByPrediction(command.predictionId);
    const recommendations = await this.deps.recommendations.findByPrediction(command.predictionId);
    const resultByKey = new Map(results.map((r) => [`${r.market}|${r.selection}`, r]));

    // Fixture label (best-effort; falls back to the matchId if no detail is available).
    const detail = await this.deps.matches.findDetailById(prediction.matchId);
    const fixtureLabel = detail
      ? `${detail.home.name} vs ${detail.away.name}`
      : (prediction.matchId as string);

    // RiskAppetite provenance is carried on the persisted recommendation set.
    const riskAppetite = recommendations[0]?.riskAppetite ?? 33;
    const riskBucket = recommendations[0]?.riskBucket ?? RiskBucket.Conservative;

    // Numbers → facts (LLM read-only context) + report selection lines (verbatim).
    const recViews = recommendations.map((rec) =>
      toRecommendationView(rec, resultByKey.get(`${rec.market}|${rec.selection}`)),
    );
    const facts = recommendations.map((rec) =>
      toFact(rec, resultByKey.get(`${rec.market}|${rec.selection}`)),
    );
    const bestFact = facts.find((_, i) => recommendations[i].isBestBet) ?? facts[0];
    const bestView = recViews.find((v) => v.isBestBet) ?? null;
    const predictionViews = results.map(toResultView);

    // Retrieve cited sources.
    const snippets = await this.deps.rag.retrieve({
      query: ragQuery(fixtureLabel, command.language),
      language: command.language,
      topK: 3,
    });
    const sources: SourceRef[] = snippets.map((s) => s.source);

    const request: ExplanationRequest = {
      language: command.language,
      fixtureLabel,
      facts,
      bestBet: bestFact,
      riskAppetite,
      riskBucket,
      sources,
    };

    const { narrative, usedFallback, attempts, violations } = await this.narrate(request);

    const content: AnalysisReportContent = {
      summary: narrative.summary,
      recentForm: narrative.recentForm,
      keyDataPoints: recViews.map(keyDataPoint),
      risks: toLines(narrative.risks),
      keyVariables: toCsvItems(narrative.keyVariables),
      reasoning: narrative.reasoning,
      marketRationale: narrative.marketRationale,
      predictions: predictionViews,
      recommendedMarkets: recViews,
      bestBet: bestView,
      alternatives: recViews.filter((v) => !v.isBestBet),
      confidence: bestView?.confidence ?? null,
      risk: bestView?.risk ?? null,
      responsibleGamblingWarning: narrative.responsibleGamblingWarning,
    };

    const record: AnalysisReportRecord = {
      id: this.deps.ids.newId() as ReportId,
      matchId: prediction.matchId,
      predictionId: command.predictionId,
      language: command.language,
      content,
      modelVersion: prediction.modelVersion,
      narrative: narrative.summary,
      sources: narrative.citations,
      riskAppetite,
      riskBucket,
      generatedAt: this.deps.clock.now(),
    };

    await this.deps.reports.save(record);
    await this.deps.cache.set(
      reportCacheKey(command.predictionId as string, command.language),
      record,
      CACHE_TTL_SECONDS,
    );
    await this.deps.cache.set(reportIdCacheKey(record.id as string), record, CACHE_TTL_SECONDS);

    return ok({ report: record, usedFallback, attempts, guardrailViolations: violations });
  }

  /** Try the injected narrator up to twice; on guardrail failure fall back to the template. */
  private async narrate(request: ExplanationRequest): Promise<{
    narrative: ExplanationNarrative;
    usedFallback: boolean;
    attempts: number;
    violations: ReadonlyArray<GuardrailViolation>;
  }> {
    let attempts = 0;
    let lastViolations: ReadonlyArray<GuardrailViolation> = [];

    while (attempts < MAX_LLM_ATTEMPTS) {
      attempts += 1;
      try {
        const candidate = await this.deps.narrator.explain(request);
        const guardrail = validateNarrative(request, candidate);
        if (guardrail.ok) {
          return { narrative: candidate, usedFallback: false, attempts, violations: [] };
        }
        lastViolations = guardrail.violations;
      } catch (error) {
        lastViolations = [
          {
            code: GuardrailCode.NarratorError,
            detail: error instanceof Error ? error.message : String(error),
          },
        ];
      }
    }

    // Every live attempt failed the guardrail — fall back to the deterministic template.
    const fallback = renderTemplateNarrative(request);
    return { narrative: fallback, usedFallback: true, attempts, violations: lastViolations };
  }
}

function ragQuery(fixtureLabel: string, language: Locale): string {
  return language === 'es'
    ? `Vista previa ${fixtureLabel}: forma reciente, bajas y contexto`
    : `${fixtureLabel} preview: recent form, injuries and context`;
}

function toFact(
  rec: RecommendationRecord,
  result: PredictionResultRecord | undefined,
): ComputedSelectionFact {
  return {
    market: rec.market,
    selection: rec.selection,
    modelProbabilityPct: (result?.modelProbability ?? 0) * 100,
    impliedProbabilityPct: (result?.impliedProbability ?? 0) * 100,
    edgePct: (result?.edge ?? 0) * 100,
    expectedValue: result?.expectedValue ?? 0,
    suggestedStakePct: (result?.suggestedStakePct ?? 0) * 100,
    confidence: rec.confidence,
    risk: rec.risk,
    rationaleCode: typeof rec.rationale === 'string' ? rec.rationale : String(rec.rationale),
  };
}

function toRecommendationView(
  rec: RecommendationRecord,
  result: PredictionResultRecord | undefined,
): ReportSelectionView {
  return {
    market: rec.market,
    selection: rec.selection,
    modelProbability: result?.modelProbability ?? 0,
    impliedProbability: result?.impliedProbability ?? null,
    edge: result?.edge ?? null,
    expectedValue: result?.expectedValue ?? null,
    suggestedStakePct: result?.suggestedStakePct ?? null,
    confidence: rec.confidence,
    risk: rec.risk,
    rationaleCode: typeof rec.rationale === 'string' ? rec.rationale : String(rec.rationale),
    isBestBet: rec.isBestBet,
  };
}

function toResultView(r: PredictionResultRecord): ReportSelectionView {
  return {
    market: r.market,
    selection: r.selection,
    modelProbability: r.modelProbability,
    impliedProbability: r.impliedProbability ?? null,
    edge: r.edge ?? null,
    expectedValue: r.expectedValue ?? null,
    suggestedStakePct: r.suggestedStakePct ?? null,
    confidence: r.confidence,
    risk: r.risk,
    rationaleCode: '',
    isBestBet: false,
  };
}

/** Deterministic, LLM-free "key data point" line built straight from the numbers. */
function keyDataPoint(v: ReportSelectionView): string {
  const implied = v.impliedProbability === null ? 'n/a' : pct1(v.impliedProbability * 100);
  const edge = v.edge === null ? 'n/a' : signedPct1(v.edge * 100);
  const ev = v.expectedValue === null ? 'n/a' : fixed(v.expectedValue, 2);
  const stake = v.suggestedStakePct === null ? 'n/a' : pct1(v.suggestedStakePct * 100);
  return `${v.market} ${v.selection}: model ${pct1(v.modelProbability * 100)} vs implied ${implied}, edge ${edge}, EV ${ev}, stake ${stake}`;
}

function toLines(text: string): string[] {
  const lines = text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return lines.length > 0 ? lines : [text.trim()].filter((s) => s.length > 0);
}

function toCsvItems(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
