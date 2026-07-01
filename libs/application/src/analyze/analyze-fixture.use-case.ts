// libs/application/src/analyze/analyze-fixture.use-case.ts
// "Analyze any free-text fixture" — the LLM_RESEARCH orchestrator.
//
//   research (FixtureResearchPort, web-search grounded ESTIMATES) →
//   ComputeFeatures → RunPrediction (OBJECTIVE probabilities) → DetectValueBets(riskAppetite) →
//   GenerateReport(language, live/dev narrator) → assemble a bilingual, risk-graded recommendation.
//
// DESIGN PRINCIPLE (architecture stays honest): the statistical model still computes the
// PROBABILITIES. The AI's job is DATA GATHERING + INPUT ESTIMATION + narration only. Every input it
// yields is an ESTIMATE from public info, provenance LLM_RESEARCH — clearly labelled, NOT a licensed
// feed — so the result ALWAYS carries an explicit AI-ESTIMATED-inputs disclaimer + responsible-
// gambling warning and is never presented as guaranteed data. The guardrail in GenerateReport still
// enforces that the narrator never emits or alters a number.
//
// The research fixture is synthetic (no Postgres row): the pipeline runs over request-scoped,
// bundle-seeded in-memory ports (see analyze-fixture.stores.ts). Persisting the analysis to Postgres
// and an async job are follow-ups (the existing repo ports have no team/team-stats write surface).
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import type {
  FixtureResearchPort,
  FixtureResearchBundle,
  ResearchTeamRef,
  PredictionModelPort,
  RiskProfileService,
  ValueCalculator,
  KellyStakeService,
  RagRetrieverPort,
  LlmExplanationPort,
  ClockPort,
  IdGeneratorPort,
  SourceRef,
  Locale,
  MatchId,
  TeamId,
  IsoDateTime,
} from '@betvision/domain';
import { LLM_RESEARCH_PROVENANCE } from '@betvision/domain';
import { ComputeFeaturesUseCase } from '../features/compute-features.use-case';
import {
  RunPredictionUseCase,
  type RunPredictionResult,
} from '../predictions/run-prediction.use-case';
import {
  DetectValueBetsUseCase,
  type DetectValueBetsResult,
} from '../predictions/detect-value-bets.use-case';
import {
  GenerateReportUseCase,
  type GenerateReportResult,
} from '../reports/generate-report.use-case';
import { buildAnalysisWorkspace, type FixtureIds } from './analyze-fixture.stores';

/** Default kickoff horizon when the researcher could not establish one (days from now). */
const DEFAULT_KICKOFF_HORIZON_DAYS = 3;
const DAY_MS = 86_400_000;

/** Bilingual AI-ESTIMATED-inputs + responsible-gambling disclaimer (always present on a result). */
const DISCLAIMER: Readonly<Record<Locale, string>> = {
  en:
    'Heads up: the statistical inputs behind this analysis (recent form, goal rates, head-to-head ' +
    'and approximate market odds) were ESTIMATED by AI from public information ' +
    '(provenance: LLM_RESEARCH). They are NOT a licensed data feed and may be inaccurate or out of ' +
    'date. The probabilities are model-derived estimates, never guarantees. Betting carries ' +
    'financial risk — only stake what you can afford to lose and bet responsibly.',
  es:
    'Aviso: los datos estadísticos de este análisis (forma reciente, ritmo goleador, historial y ' +
    'cuotas aproximadas del mercado) fueron ESTIMADOS por IA a partir de información pública ' +
    '(procedencia: LLM_RESEARCH). No provienen de un proveedor de datos con licencia y pueden ser ' +
    'inexactos o estar desactualizados. Las probabilidades son estimaciones del modelo, nunca ' +
    'garantías. Apostar conlleva un riesgo financiero: apuesta solo lo que puedas permitirte perder ' +
    'y hazlo con responsabilidad.',
};

export interface AnalyzeFixtureCommand {
  readonly query: string;
  /** 0..100 slider. Omitted ⇒ 33 (conservative default). NEVER affects model probabilities. */
  readonly riskAppetite?: number;
  /** Report + disclaimer language. Omitted ⇒ 'en'. */
  readonly language?: Locale;
}

export interface AnalyzeFixtureResult {
  readonly query: string;
  /** Teams / competition / kickoff resolved from the free-text query (AI-ESTIMATED). */
  readonly fixture: {
    readonly home: ResearchTeamRef;
    readonly away: ResearchTeamRef;
    readonly competition: string | null;
    readonly kickoffUtc: IsoDateTime | null;
  };
  /** Objective run (probabilities) — the numbers come only from the statistical model. */
  readonly run: RunPredictionResult;
  /** Risk-shaped value detection at the requested appetite. */
  readonly detect: DetectValueBetsResult;
  /** The assembled bilingual report + guardrail metadata. */
  readonly report: GenerateReportResult;
  /** Cited research sources merged with the report's RAG sources (provider LLM_RESEARCH first). */
  readonly sources: ReadonlyArray<SourceRef>;
  /** Explicit AI-ESTIMATED-inputs + responsible-gambling disclaimer (in `language`). */
  readonly disclaimer: string;
  /** Always true — the quantitative inputs were ESTIMATED by AI, not sourced from a licensed feed. */
  readonly aiEstimatedInputs: true;
  /** Provenance stamp on every research-sourced input. Always 'LLM_RESEARCH'. */
  readonly provenance: typeof LLM_RESEARCH_PROVENANCE;
}

export interface AnalyzeFixtureDeps {
  readonly research: FixtureResearchPort;
  readonly model: PredictionModelPort;
  readonly riskProfiles: RiskProfileService;
  readonly valueCalculator: ValueCalculator;
  readonly kelly: KellyStakeService;
  readonly rag: RagRetrieverPort;
  readonly narrator: LlmExplanationPort;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
}

export class AnalyzeFixtureUseCase {
  constructor(private readonly deps: AnalyzeFixtureDeps) {}

  async execute(
    command: AnalyzeFixtureCommand,
  ): Promise<Result<AnalyzeFixtureResult, DomainError>> {
    const query = command.query.trim();
    if (query.length === 0) return err(DomainError.of(DomainErrorCode.FIXTURE_QUERY_EMPTY));

    const language: Locale = command.language ?? 'en';
    const riskAppetite = command.riskAppetite ?? 33;

    // 1) Research the fixture (web-search grounded ESTIMATES). A provider failure is a domain outcome.
    let bundle: FixtureResearchBundle;
    try {
      bundle = await this.deps.research.research({ query, language });
    } catch (error) {
      return err(
        DomainError.of(DomainErrorCode.FIXTURE_RESEARCH_FAILED, {
          reason: error instanceof Error ? error.message : String(error),
        }),
      );
    }

    // 2) Deterministic, per-fixture ids (NOT the running id counter) so re-analysing the SAME
    //    fixture yields identical features → identical model probabilities regardless of appetite.
    const ids = this.fixtureIds(bundle);
    const kickoffUtc = this.resolveKickoff(bundle.kickoffUtc);

    // 3) Seed the request-scoped pipeline stores from the AI-estimated inputs.
    const ws = buildAnalysisWorkspace(bundle, ids, kickoffUtc);

    // 4) ComputeFeatures → RunPrediction (objective probabilities from features ONLY).
    const runPrediction = new RunPredictionUseCase({
      computeFeatures: new ComputeFeaturesUseCase({
        matches: ws.matches,
        teams: ws.teams,
        sportsData: ws.sportsData,
        teamStats: ws.teamStats,
      }),
      model: this.deps.model,
      predictions: ws.predictions,
      predictionResults: ws.predictionResults,
      predictionInputs: ws.predictionInputs,
      ids: this.deps.ids,
    });
    const run = await runPrediction.execute({ matchId: ids.matchId });
    if (!run.ok) return err(run.error);

    // 5) DetectValueBets(riskAppetite) — odds + risk shape SELECTION, never the probabilities.
    const detectValueBets = new DetectValueBetsUseCase({
      predictions: ws.predictions,
      predictionResults: ws.predictionResults,
      odds: ws.odds,
      recommendations: ws.recommendations,
      riskProfiles: this.deps.riskProfiles,
      valueCalculator: this.deps.valueCalculator,
      kelly: this.deps.kelly,
    });
    const detect = await detectValueBets.execute({
      predictionId: run.value.predictionId,
      riskAppetite,
    });
    if (!detect.ok) return err(detect.error);

    // 6) GenerateReport(language) — the live/dev narrator EXPLAINS the numbers (guardrail enforced).
    const generateReport = new GenerateReportUseCase({
      predictions: ws.predictions,
      predictionResults: ws.predictionResults,
      recommendations: ws.recommendations,
      matches: ws.matches,
      rag: this.deps.rag,
      narrator: this.deps.narrator,
      reports: ws.reports,
      cache: ws.cache,
      clock: this.deps.clock,
      ids: this.deps.ids,
    });
    const report = await generateReport.execute({
      predictionId: run.value.predictionId,
      language,
    });
    if (!report.ok) return err(report.error);

    return ok({
      query,
      fixture: {
        home: bundle.home,
        away: bundle.away,
        competition: bundle.competition,
        kickoffUtc: bundle.kickoffUtc,
      },
      run: run.value,
      detect: detect.value,
      report: report.value,
      sources: mergeSources(bundle.sources, report.value.report.sources),
      disclaimer: DISCLAIMER[language],
      aiEstimatedInputs: true,
      provenance: LLM_RESEARCH_PROVENANCE,
    });
  }

  /** Stable, per-fixture branded ids derived from the resolved team names (not the id counter). */
  private fixtureIds(bundle: FixtureResearchBundle): FixtureIds {
    const homeSlug = slugify(bundle.home.name);
    let awaySlug = slugify(bundle.away.name);
    if (awaySlug === homeSlug) awaySlug = `${awaySlug}-away`; // never let a team play itself
    return {
      homeTeamId: `llm-team:${homeSlug}` as TeamId,
      awayTeamId: `llm-team:${awaySlug}` as TeamId,
      matchId: `llm-match:${homeSlug}--${awaySlug}` as MatchId,
    };
  }

  /** Use the researched kickoff when parseable; otherwise a near-future default (deterministic-ish). */
  private resolveKickoff(kickoffUtc: IsoDateTime | null): IsoDateTime {
    if (kickoffUtc) {
      const parsed = Date.parse(kickoffUtc);
      if (Number.isFinite(parsed)) return new Date(parsed).toISOString() as IsoDateTime;
    }
    const base = Date.parse(this.deps.clock.now());
    const now = Number.isFinite(base) ? base : Date.now();
    return new Date(now + DEFAULT_KICKOFF_HORIZON_DAYS * DAY_MS).toISOString() as IsoDateTime;
  }
}

/** Merge research (LLM_RESEARCH) sources with the report's RAG sources, research first, deduped. */
function mergeSources(
  research: ReadonlyArray<SourceRef>,
  rag: ReadonlyArray<SourceRef>,
): SourceRef[] {
  const seen = new Set<string>();
  const out: SourceRef[] = [];
  for (const s of [...research, ...rag]) {
    const key = `${s.provider}|${s.label}|${s.url ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'x'
  );
}
