// Pure unit tests for the Phase-12 narrative guardrail. No testing-lib import (domain may depend
// only on domain/shared), so fixtures are built inline.
import {
  validateNarrative,
  detectLanguage,
  GuardrailCode,
} from './narrative-guardrail';
import type {
  ExplanationRequest,
  ExplanationNarrative,
  ComputedSelectionFact,
  SourceRef,
} from '../ports/llm-explanation.port';

const fact: ComputedSelectionFact = {
  market: '1X2',
  selection: 'HOME',
  modelProbabilityPct: 55,
  impliedProbabilityPct: 50,
  edgePct: 5,
  expectedValue: 0.1,
  suggestedStakePct: 1,
  confidence: 'high',
  risk: 'low',
};

const source: SourceRef = { label: 'Dev source', provider: 'dev-rag-stub' };

const request = (over: Partial<ExplanationRequest> = {}): ExplanationRequest => ({
  language: 'en',
  fixtureLabel: 'Riverside City vs Kingsford United',
  facts: [fact],
  bestBet: fact,
  riskAppetite: 85,
  riskBucket: 'aggressive',
  sources: [source],
  ...over,
});

const goodNarrative = (over: Partial<ExplanationNarrative> = {}): ExplanationNarrative => ({
  language: 'en',
  summary:
    'The strongest model value is HOME in the 1X2 market: a model probability of 55.0% against the market-implied 50.0% with an edge of +5.0%.',
  recentForm: 'Recent form and team news are drawn from the cited sources below.',
  risks: 'This report was analysed at a risk setting of 85 out of 100; higher risk means higher variance.',
  keyVariables: '1X2 HOME',
  reasoning: 'Value appears where the model probability sits above the market-implied probability.',
  marketRationale: 'HOME offers the largest risk-adjusted margin over the market.',
  responsibleGamblingWarning:
    'Higher risk means higher variance, not guaranteed higher returns. Bet responsibly.',
  citations: [source],
  ...over,
});

describe('detectLanguage', () => {
  it('classifies English prose as en', () => {
    expect(detectLanguage('The model probability is higher than the market value at this risk.')).toBe('en');
  });
  it('classifies Spanish prose as es', () => {
    expect(
      detectLanguage('La probabilidad del modelo es mayor que el valor del mercado con este riesgo.'),
    ).toBe('es');
  });
});

describe('validateNarrative', () => {
  it('accepts a faithful, in-language, cited narrative with the RG warning', () => {
    const result = validateNarrative(request(), goodNarrative());
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('REJECTS a narrative that fabricates a contradicting probability', () => {
    const bad = goodNarrative({
      summary: 'The model gives HOME a 92.0% chance — a certain winner at these odds.',
    });
    const result = validateNarrative(request(), bad);
    expect(result.ok).toBe(false);
    expect(result.violations.map((v) => v.code)).toContain(GuardrailCode.NumericContradiction);
  });

  it('REJECTS a narrative that omits the responsible-gambling warning', () => {
    const bad = goodNarrative({ responsibleGamblingWarning: '' });
    const result = validateNarrative(request(), bad);
    expect(result.ok).toBe(false);
    expect(result.violations.map((v) => v.code)).toContain(
      GuardrailCode.MissingResponsibleGamblingWarning,
    );
  });

  it('REJECTS a narrative written in the wrong language', () => {
    const bad = goodNarrative({
      language: 'en',
      summary: 'La probabilidad del modelo para el equipo local supera el valor implícito del mercado.',
      recentForm: 'La forma reciente proviene de las fuentes citadas más abajo.',
      risks: 'Este informe se analizó con un nivel de riesgo alto; más riesgo implica más varianza.',
      keyVariables: 'mercado local',
      reasoning: 'El valor aparece cuando la probabilidad del modelo supera la del mercado.',
      marketRationale: 'La selección local ofrece el mayor margen sobre el mercado.',
      responsibleGamblingWarning:
        'Más riesgo significa más varianza, no retornos garantizados. Apuesta con responsabilidad.',
    });
    const result = validateNarrative(request({ language: 'en' }), bad);
    expect(result.ok).toBe(false);
    expect(result.violations.map((v) => v.code)).toContain(GuardrailCode.WrongLanguageProse);
  });

  it('REJECTS a narrative that cites nothing when sources were supplied', () => {
    const bad = goodNarrative({ citations: [] });
    const result = validateNarrative(request(), bad);
    expect(result.ok).toBe(false);
    expect(result.violations.map((v) => v.code)).toContain(GuardrailCode.MissingCitations);
  });
});
