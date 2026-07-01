// libs/testing/src/fakes/fake-llm-explanation.port.ts
import type {
  LlmExplanationPort,
  ExplanationRequest,
  ExplanationNarrative,
} from '@betvision/domain';

/**
 * Echoes the pre-computed facts back as templated prose. It NEVER invents or mutates a
 * number — it only formats the facts it was given — which is exactly the guardrail the
 * real adapter must honour. Records requests for assertions.
 */
export class FakeLlmExplanationPort implements LlmExplanationPort {
  readonly requests: ExplanationRequest[] = [];

  async explain(request: ExplanationRequest): Promise<ExplanationNarrative> {
    this.requests.push(request);
    const best = request.bestBet;
    const summary = best
      ? `Best bet ${best.selection} (${best.market}) at model ${best.modelProbabilityPct}% vs implied ${best.impliedProbabilityPct}%.`
      : `No standout selection for ${request.fixtureLabel}.`;

    return {
      language: request.language,
      summary,
      recentForm: `Form summary for ${request.fixtureLabel}.`,
      risks: `Analyzed at risk ${request.riskAppetite}/100 (${request.riskBucket}).`,
      keyVariables: request.facts.map((f) => `${f.market}:${f.selection}`).join(', '),
      reasoning: `${request.facts.length} selection(s) considered.`,
      marketRationale: 'Derived strictly from the provided, pre-computed numbers.',
      responsibleGamblingWarning:
        'Higher risk means higher variance, not guaranteed higher returns. Bet responsibly.',
      citations: request.sources,
    };
  }
}
