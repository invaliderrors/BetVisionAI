// libs/domain/src/ai/narrative-guardrail.ts
// Phase 12 GUARDRAIL (pure, deterministic, framework-free). The LLM EXPLAINS numbers; it must
// never PRODUCE or ALTER one. Because the ExplanationNarrative return type is strings-only, the
// explanation layer is structurally incapable of emitting a probability field — this validator is
// the second line of defence over the PROSE: it asserts the narrative
//   (1) carries the requested language (field + detected prose language),
//   (2) contains the responsible-gambling warning,
//   (3) cites at least one source when sources were supplied, and
//   (4) makes no percentage claim that contradicts the pre-computed inputs.
// On failure the caller regenerates once, then falls back to a fully-templated report.
import type { ExplanationRequest, ExplanationNarrative } from '../ports/llm-explanation.port';
import type { Locale } from '../ports/shared.dto';

export enum GuardrailCode {
  LanguageFieldMismatch = 'guardrail.language_field_mismatch',
  WrongLanguageProse = 'guardrail.wrong_language_prose',
  MissingResponsibleGamblingWarning = 'guardrail.missing_responsible_gambling_warning',
  MissingCitations = 'guardrail.missing_citations',
  NumericContradiction = 'guardrail.numeric_contradiction',
  /** The narrator threw (network/parse error) — treated as a rejected attempt. */
  NarratorError = 'guardrail.narrator_error',
}

export interface GuardrailViolation {
  readonly code: GuardrailCode;
  readonly detail: string;
}

export interface GuardrailResult {
  readonly ok: boolean;
  readonly violations: ReadonlyArray<GuardrailViolation>;
}

/** Percentage points of slack absorbing rounding between the facts and the rendered prose. */
const PERCENT_TOLERANCE = 0.35;

/** Common stop-words per language — enough signal to classify template/LLM prose deterministically. */
const LANGUAGE_MARKERS: Readonly<Record<Locale, ReadonlyArray<string>>> = {
  en: [
    ' the ', ' and ', ' of ', ' to ', ' is ', ' at ', ' with ', ' this ', ' model ',
    ' market ', ' value ', ' risk ', ' higher ', ' probability ', ' selection ', ' return ',
  ],
  es: [
    ' el ', ' la ', ' de ', ' que ', ' con ', ' los ', ' las ', ' una ', ' modelo ',
    ' mercado ', ' valor ', ' riesgo ', ' probabilidad ', ' selección ', ' más ', ' apuesta ',
  ],
};

/** Responsible-gambling markers per language (covers responsible/responsibly, responsable/responsabilidad). */
const RG_MARKERS: Readonly<Record<Locale, RegExp>> = {
  en: /responsibl/i,
  es: /responsab/i,
};

/** Deterministic, dependency-free language guess by weighted stop-word frequency. */
export function detectLanguage(text: string): Locale {
  const haystack = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;
  const score = (markers: ReadonlyArray<string>): number =>
    markers.reduce((sum, m) => sum + occurrences(haystack, m), 0);
  return score(LANGUAGE_MARKERS.es) > score(LANGUAGE_MARKERS.en) ? 'es' : 'en';
}

function occurrences(haystack: string, needle: string): number {
  let count = 0;
  let from = 0;
  for (;;) {
    // Overlapping search (advance by 1) so ' de ' inside ' de de ' still counts twice.
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    count += 1;
    from = at + 1;
  }
  return count;
}

/** Extract every percentage token (e.g. "55.0%", "+5.0 %") as a non-negative magnitude. */
function extractPercentages(text: string): number[] {
  const out: number[] = [];
  const re = /(-?\d+(?:\.\d+)?)\s*%/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const value = Number.parseFloat(match[1]);
    if (Number.isFinite(value)) out.push(Math.abs(value));
  }
  return out;
}

/** The set of percentage magnitudes the prose is ALLOWED to mention (from the pre-computed facts). */
function allowedPercentages(request: ExplanationRequest): number[] {
  const allowed: number[] = [];
  for (const f of request.facts) {
    allowed.push(
      Math.abs(f.modelProbabilityPct),
      Math.abs(f.impliedProbabilityPct),
      Math.abs(f.edgePct),
      Math.abs(f.suggestedStakePct),
    );
  }
  return allowed;
}

export function validateNarrative(
  request: ExplanationRequest,
  narrative: ExplanationNarrative,
): GuardrailResult {
  const violations: GuardrailViolation[] = [];

  const allText = [
    narrative.summary,
    narrative.recentForm,
    narrative.risks,
    narrative.keyVariables,
    narrative.reasoning,
    narrative.marketRationale,
    narrative.responsibleGamblingWarning,
  ].join('\n');

  // (1) Language — declared field + detected prose language.
  if (narrative.language !== request.language) {
    violations.push({
      code: GuardrailCode.LanguageFieldMismatch,
      detail: `narrative.language=${narrative.language} expected=${request.language}`,
    });
  }
  const detected = detectLanguage(allText);
  if (detected !== request.language) {
    violations.push({
      code: GuardrailCode.WrongLanguageProse,
      detail: `detected=${detected} expected=${request.language}`,
    });
  }

  // (2) Responsible-gambling warning present and in the requested language.
  const warning = narrative.responsibleGamblingWarning?.trim() ?? '';
  if (warning.length === 0 || !RG_MARKERS[request.language].test(warning)) {
    violations.push({
      code: GuardrailCode.MissingResponsibleGamblingWarning,
      detail: 'responsible-gambling warning missing or not in the requested language',
    });
  }

  // (3) Citations present when sources were supplied.
  if (request.sources.length > 0 && narrative.citations.length === 0) {
    violations.push({
      code: GuardrailCode.MissingCitations,
      detail: 'sources were provided but the narrative cited none',
    });
  }

  // (4) No percentage claim that contradicts the pre-computed inputs.
  const allowed = allowedPercentages(request);
  for (const pct of extractPercentages(allText)) {
    const supported = allowed.some((a) => Math.abs(a - pct) <= PERCENT_TOLERANCE);
    if (!supported) {
      violations.push({
        code: GuardrailCode.NumericContradiction,
        detail: `prose mentions ${pct}% which is not among the persisted numbers`,
      });
    }
  }

  return { ok: violations.length === 0, violations };
}
