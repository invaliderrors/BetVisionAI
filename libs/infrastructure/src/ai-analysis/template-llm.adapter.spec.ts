// The dev TemplateLlmAdapter is deterministic, bilingual, and guardrail-valid by construction.
import { validateNarrative, type ExplanationRequest, type ComputedSelectionFact } from '@betvision/domain';
import { TemplateLlmAdapter } from './template-llm.adapter';

const fact: ComputedSelectionFact = {
  market: 'OU_2_5',
  selection: 'OVER',
  modelProbabilityPct: 62.5,
  impliedProbabilityPct: 54.1,
  edgePct: 8.4,
  expectedValue: 0.16,
  suggestedStakePct: 2.0,
  confidence: 'medium',
  risk: 'medium',
  rationaleCode: 'domain.value.rationale.positive_edge_best_bet',
};

const request = (language: 'en' | 'es'): ExplanationRequest => ({
  language,
  fixtureLabel: 'Riverside City vs Kingsford United',
  facts: [fact],
  bestBet: fact,
  riskAppetite: 50,
  riskBucket: 'balanced',
  sources: [{ label: 'Dev source', provider: 'dev-rag-stub' }],
});

describe('TemplateLlmAdapter', () => {
  const adapter = new TemplateLlmAdapter();

  it('is deterministic (same input → identical narrative)', async () => {
    const a = await adapter.explain(request('en'));
    const b = await adapter.explain(request('en'));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('passes the guardrail in EN and ES and cites the provided sources', async () => {
    for (const lang of ['en', 'es'] as const) {
      const req = request(lang);
      const narrative = await adapter.explain(req);
      expect(validateNarrative(req, narrative).ok).toBe(true);
      expect(narrative.citations).toEqual(req.sources);
      expect(narrative.language).toBe(lang);
    }
  });
});
