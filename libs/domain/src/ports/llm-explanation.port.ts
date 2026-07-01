// libs/domain/src/ports/llm-explanation.port.ts
import type { Locale } from './shared.dto';

/**
 * Read-only snapshot of ALREADY-COMPUTED numbers passed to the LLM purely for narration.
 * The LLM receives these to explain them; it cannot feed anything back that changes them.
 */
export interface ComputedSelectionFact {
  readonly market: string;
  readonly selection: string;
  readonly modelProbabilityPct: number; // display only
  readonly impliedProbabilityPct: number; // display only
  readonly edgePct: number; // display only
  readonly expectedValue: number; // display only
  readonly suggestedStakePct: number; // display only
  readonly confidence: string;
  readonly risk: string;
}

export interface SourceRef {
  readonly label: string;
  readonly provider: string;
  readonly url?: string;
}

export interface ExplanationRequest {
  readonly language: Locale; // 'en' | 'es'
  readonly fixtureLabel: string;
  /** Frozen, pre-computed facts. Numbers are inputs to PROSE, never re-derived. */
  readonly facts: ReadonlyArray<ComputedSelectionFact>;
  readonly bestBet?: ComputedSelectionFact;
  readonly riskAppetite: number; // echoed for "analyzed at risk N/100"
  readonly riskBucket: string;
  readonly sources: ReadonlyArray<SourceRef>;
}

/**
 * RETURN TYPE CONTAINS STRINGS ONLY. No Probability / Edge / EV / Stake fields exist here,
 * so the explanation layer is STRUCTURALLY incapable of producing or altering a number.
 */
export interface ExplanationNarrative {
  readonly language: Locale;
  readonly summary: string;
  readonly recentForm: string;
  readonly risks: string;
  readonly keyVariables: string;
  readonly reasoning: string;
  readonly marketRationale: string;
  readonly responsibleGamblingWarning: string;
  readonly citations: ReadonlyArray<SourceRef>;
}

export interface LlmExplanationPort {
  explain(request: ExplanationRequest): Promise<ExplanationNarrative>;
}
