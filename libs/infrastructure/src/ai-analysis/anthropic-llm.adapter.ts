// libs/infrastructure/src/ai-analysis/anthropic-llm.adapter.ts
// LLM_MODE=live adapter — implements LlmExplanationPort via the Anthropic SDK.
//
// MODEL: `claude-opus-4-8` (Claude Opus 4.8) — the current default per the claude-api skill
// reference; NOT guessed. Adaptive thinking / effort tuning can be layered on later.
//
// GUARDRAIL: the persisted numbers are passed as READ-ONLY context; the prompt forbids producing or
// changing any number, requires cite-sources + never-guarantee + output-in-the-requested-language,
// and requires a STRUCTURED (JSON) response. Because ExplanationNarrative is strings-only, this
// adapter is STRUCTURALLY unable to emit a probability field; on top of that, GenerateReportUseCase
// runs the post-generation guardrail and falls back to the deterministic template on any failure.
// `citations` are always the RETRIEVED sources — the model is never trusted to invent a source.
import Anthropic from '@anthropic-ai/sdk';
import type {
  LlmExplanationPort,
  ExplanationRequest,
  ExplanationNarrative,
  SourceRef,
  Locale,
} from '@betvision/domain';

/** The current model id used for the live narration (see claude-api skill reference). */
export const ANTHROPIC_MODEL_ID = 'claude-opus-4-8';

const SYSTEM_PROMPT = [
  'You are a betting-analysis WRITER for a responsible-gambling product.',
  'You receive ALREADY-COMPUTED numbers (probabilities, edges, expected value, stakes) as READ-ONLY context.',
  'Absolute rules:',
  '1. NEVER produce, invent, round, or change ANY number. Refer to the provided numbers only; do not add new ones.',
  '2. Explain and synthesize the numbers in clear prose. Cite the provided sources; do not invent sources.',
  '3. NEVER guarantee an outcome or imply higher risk means higher expected return.',
  '4. Always include a responsible-gambling warning.',
  '5. Write ALL prose in the requested language (en = English, es = Spanish).',
  'Respond with a SINGLE JSON object and nothing else, with these string keys:',
  'summary, recentForm, risks, keyVariables, reasoning, marketRationale, responsibleGamblingWarning.',
].join('\n');

export class AnthropicLlmAdapter implements LlmExplanationPort {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string = ANTHROPIC_MODEL_ID,
    private readonly maxTokens = 1500,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async explain(request: ExplanationRequest): Promise<ExplanationNarrative> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(request),
        },
      ],
    });

    let text = '';
    for (const block of message.content) {
      if (block.type === 'text') text += block.text;
    }

    const parsed = parseJsonObject(text);
    return coerceNarrative(parsed, request.language, request.sources);
  }
}

function buildUserPrompt(request: ExplanationRequest): string {
  const payload = {
    language: request.language,
    fixtureLabel: request.fixtureLabel,
    riskAppetite: request.riskAppetite,
    riskBucket: request.riskBucket,
    facts: request.facts,
    bestBet: request.bestBet ?? null,
    sources: request.sources,
  };
  return [
    `Requested language: ${request.language}.`,
    'READ-ONLY numbers and sources (do not change any number, cite these sources):',
    JSON.stringify(payload),
    'Return the JSON object described in the system prompt now.',
  ].join('\n');
}

function parseJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Anthropic response did not contain a JSON object');
  }
  return JSON.parse(text.slice(start, end + 1)) as unknown;
}

function coerceNarrative(
  json: unknown,
  language: Locale,
  sources: ReadonlyArray<SourceRef>,
): ExplanationNarrative {
  if (typeof json !== 'object' || json === null) {
    throw new Error('Anthropic response JSON was not an object');
  }
  const o = json as Record<string, unknown>;
  const str = (key: string): string => {
    const value = o[key];
    if (typeof value !== 'string') {
      throw new Error(`Anthropic response missing string field: ${key}`);
    }
    return value;
  };
  return {
    language,
    summary: str('summary'),
    recentForm: str('recentForm'),
    risks: str('risks'),
    keyVariables: str('keyVariables'),
    reasoning: str('reasoning'),
    marketRationale: str('marketRationale'),
    responsibleGamblingWarning: str('responsibleGamblingWarning'),
    // Citations are always the retrieved sources — the model never invents a source.
    citations: sources,
  };
}
