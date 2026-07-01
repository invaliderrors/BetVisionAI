// Determinism + bilingual + guardrail-validity of the pure template narrator. No testing-lib
// import (application may depend only on domain/contracts/shared), so fixtures are inline.
import { renderTemplateNarrative } from './template-narrative';
import {
  validateNarrative,
  RecommendationRationale,
  type ExplanationRequest,
  type ComputedSelectionFact,
} from '@betvision/domain';

const fact: ComputedSelectionFact = {
  market: '1X2',
  selection: 'HOME',
  modelProbabilityPct: 57.3,
  impliedProbabilityPct: 51.2,
  edgePct: 6.1,
  expectedValue: 0.12,
  suggestedStakePct: 1.5,
  confidence: 'high',
  risk: 'low',
  rationaleCode: RecommendationRationale.PositiveEdgeBestBet,
};

const request = (language: 'en' | 'es'): ExplanationRequest => ({
  language,
  fixtureLabel: 'Riverside City vs Kingsford United',
  facts: [fact],
  bestBet: fact,
  riskAppetite: 85,
  riskBucket: 'aggressive',
  sources: [{ label: 'Dev source', provider: 'dev-rag-stub' }],
});

describe('renderTemplateNarrative', () => {
  it('is deterministic: identical request → byte-identical narrative', () => {
    const a = renderTemplateNarrative(request('en'));
    const b = renderTemplateNarrative(request('en'));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('passes its own guardrail in both languages', () => {
    for (const lang of ['en', 'es'] as const) {
      const req = request(lang);
      const narrative = renderTemplateNarrative(req);
      const result = validateNarrative(req, narrative);
      expect(result.violations).toHaveLength(0);
      expect(result.ok).toBe(true);
      expect(narrative.language).toBe(lang);
    }
  });

  it('produces different prose per language from the SAME numbers', () => {
    const en = renderTemplateNarrative(request('en'));
    const es = renderTemplateNarrative(request('es'));
    expect(en.summary).not.toBe(es.summary);
    // The persisted numbers appear identically in both prose renderings.
    expect(en.summary).toContain('57.3%');
    expect(es.summary).toContain('57.3%');
  });
});
