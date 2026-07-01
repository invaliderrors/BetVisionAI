// libs/application/src/reports/template-narrative.ts
// Phase 12 — DETERMINISTIC, bilingual template narrator. Pure function of the ExplanationRequest:
// same request → byte-identical narrative. It EXPLAINS the pre-computed facts; every percentage it
// prints comes straight from a fact, so it passes the guardrail by construction. Used two ways:
//   • wrapped by the infra TemplateLlmAdapter (LLM_MODE=dev, and in tests here) and
//   • as the guaranteed fallback inside GenerateReportUseCase when a live narration fails the guardrail.
// It has NO IO and NO framework deps, so it is safe to reuse across the infra adapter and use cases.
import {
  RecommendationRationale,
  type ExplanationRequest,
  type ExplanationNarrative,
  type ComputedSelectionFact,
  type Locale,
} from '@betvision/domain';

const pct = (n: number): string => `${n.toFixed(1)}%`;
const signedPct = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
const num = (n: number): string => n.toFixed(2);

interface Phrasebook {
  readonly summaryBest: (f: ComputedSelectionFact, fixture: string) => string;
  readonly summaryNone: (fixture: string) => string;
  readonly recentForm: string;
  readonly risks: (appetite: number, bucket: string) => ReadonlyArray<string>;
  readonly reasoning: (count: number) => string;
  readonly rationale: (f: ComputedSelectionFact) => string;
  readonly rgWarning: string;
}

function selectionLabel(f: ComputedSelectionFact): string {
  return `${f.selection} (${f.market})`;
}

const EN: Phrasebook = {
  summaryBest: (f, fixture) =>
    `The strongest model-identified value for ${fixture} is ${f.selection} in the ${f.market} market. ` +
    `The model estimates ${pct(f.modelProbabilityPct)} against the market-implied ${pct(
      f.impliedProbabilityPct,
    )}, an edge of ${signedPct(f.edgePct)} with an expected value of ${num(f.expectedValue)}. ` +
    `These numbers come straight from the persisted prediction and were not changed for this write-up.`,
  summaryNone: (fixture) =>
    `No selection cleared the risk profile for ${fixture}, so there is no standout value bet in this template report.`,
  recentForm:
    'Recent form and team-news context are drawn from the cited sources below; the probabilities ' +
    'themselves are model-derived and remain fixed across languages.',
  risks: (appetite, bucket) => [
    `This report was analysed at a risk setting of ${appetite} out of 100 (${bucket}). ` +
      'A higher setting means more variance, not a higher expected return.',
    'Every selection keeps its own confidence and market-volatility band, so treat all figures as ' +
      'probabilities and never as guarantees.',
  ],
  reasoning: (count) =>
    `Value appears wherever the model probability sits above the de-margined market-implied probability. ` +
    `${count} selection(s) cleared the chosen risk profile for this fixture, and none of the underlying ` +
    `numbers were produced or altered by this narrative step.`,
  rationale: (f) => {
    const label = selectionLabel(f);
    switch (f.rationaleCode) {
      case RecommendationRationale.PositiveEdgeBestBet:
        return `${label} offers the largest risk-adjusted margin over the market.`;
      case RecommendationRationale.PositiveEdgeAlternative:
        return `${label} is a supporting selection with a positive edge that still clears the risk profile.`;
      default:
        return `${label} is included based on its persisted value metrics.`;
    }
  },
  rgWarning:
    'Betting carries financial risk. Higher risk means higher variance, not guaranteed higher returns — ' +
    'only stake what you can afford to lose and bet responsibly.',
};

const ES: Phrasebook = {
  summaryBest: (f, fixture) =>
    `La mayor oportunidad de valor que identifica el modelo para ${fixture} es ${f.selection} en el mercado ${f.market}. ` +
    `El modelo estima ${pct(f.modelProbabilityPct)} frente al ${pct(
      f.impliedProbabilityPct,
    )} implícito del mercado, con un margen de ${signedPct(f.edgePct)} y un valor esperado de ${num(
      f.expectedValue,
    )}. ` +
    `Estas cifras provienen directamente de la predicción almacenada y no se han modificado para este resumen.`,
  summaryNone: (fixture) =>
    `Ninguna selección superó el perfil de riesgo para ${fixture}, así que no hay una apuesta de valor destacada en este informe de plantilla.`,
  recentForm:
    'La forma reciente y el contexto del partido provienen de las fuentes citadas más abajo; las ' +
    'probabilidades son del modelo y permanecen fijas en todos los idiomas.',
  risks: (appetite, bucket) => [
    `Este informe se analizó con un nivel de riesgo de ${appetite} sobre 100 (${bucket}). ` +
      'Un nivel más alto implica más varianza, no un mayor valor esperado.',
    'Cada selección mantiene su propia banda de confianza y de volatilidad de mercado, así que trata ' +
      'todas las cifras como probabilidades y nunca como garantías.',
  ],
  reasoning: (count) =>
    `El valor aparece cuando la probabilidad del modelo supera a la probabilidad implícita del mercado sin margen. ` +
    `${count} selección(es) superaron el perfil de riesgo elegido para este partido, y ninguno de los ` +
    `números fue producido ni alterado por este paso narrativo.`,
  rationale: (f) => {
    const label = selectionLabel(f);
    switch (f.rationaleCode) {
      case RecommendationRationale.PositiveEdgeBestBet:
        return `${label} ofrece el mayor margen ajustado por riesgo sobre el mercado.`;
      case RecommendationRationale.PositiveEdgeAlternative:
        return `${label} es una selección de apoyo con un margen positivo que también cumple el perfil de riesgo.`;
      default:
        return `${label} se incluye según sus métricas de valor almacenadas.`;
    }
  },
  rgWarning:
    'Apostar conlleva un riesgo financiero. Más riesgo significa más varianza, no retornos garantizados: ' +
    'apuesta solo lo que puedas permitirte perder y hazlo con responsabilidad.',
};

const BOOK: Readonly<Record<Locale, Phrasebook>> = { en: EN, es: ES };

/** Render the deterministic template narrative for a request (dev narrator + guardrail fallback). */
export function renderTemplateNarrative(request: ExplanationRequest): ExplanationNarrative {
  const book = BOOK[request.language];
  const best = request.bestBet ?? request.facts[0];

  const summary = best
    ? book.summaryBest(best, request.fixtureLabel)
    : book.summaryNone(request.fixtureLabel);

  const keyVariables = request.facts.map((f) => `${f.market} ${f.selection}`).join(', ');
  const marketRationale = request.facts.map((f) => book.rationale(f)).join(' ');

  return {
    language: request.language,
    summary,
    recentForm: book.recentForm,
    risks: book.risks(request.riskAppetite, request.riskBucket).join('\n'),
    keyVariables,
    reasoning: book.reasoning(request.facts.length),
    marketRationale,
    responsibleGamblingWarning: book.rgWarning,
    citations: request.sources,
  };
}
