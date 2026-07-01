// libs/testing/src/mothers/explanation.mother.ts
import type {
  ComputedSelectionFact,
  ExplanationRequest,
  SourceRef,
} from '@betvision/domain';

export const aComputedSelectionFact = (
  over: Partial<ComputedSelectionFact> = {},
): ComputedSelectionFact => ({
  market: '1X2',
  selection: 'HOME',
  modelProbabilityPct: 55,
  impliedProbabilityPct: 50,
  edgePct: 5,
  expectedValue: 0.1,
  suggestedStakePct: 1,
  confidence: 'high',
  risk: 'low',
  ...over,
});

export const aSourceRef = (over: Partial<SourceRef> = {}): SourceRef => ({
  label: 'Test Source',
  provider: 'fake-provider',
  ...over,
});

export const anExplanationRequest = (
  over: Partial<ExplanationRequest> = {},
): ExplanationRequest => {
  const facts = over.facts ?? [aComputedSelectionFact()];
  return {
    language: 'en',
    fixtureLabel: 'Real Madrid vs Barcelona',
    facts,
    bestBet: facts[0],
    riskAppetite: 33,
    riskBucket: 'conservative',
    sources: [aSourceRef()],
    ...over,
  };
};
