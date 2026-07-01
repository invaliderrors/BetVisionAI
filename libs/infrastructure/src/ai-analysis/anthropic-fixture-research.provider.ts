// libs/infrastructure/src/ai-analysis/anthropic-fixture-research.provider.ts
// DATA_SOURCE_MODE=research adapter — implements FixtureResearchPort via the Anthropic SDK using the
// WEB SEARCH server tool (grounding) + a STRICT structured-output tool (typed estimates + citations).
//
// MODEL: `claude-opus-4-8` (shared with the live narrator). WEB SEARCH tool: `web_search_20260209`
// (dynamic filtering; the current variant for Opus 4.8 per the claude-api skill reference — NOT
// guessed). The model searches the web for RECENT public info, then calls `submit_fixture_research`
// exactly once so the ESTIMATES arrive as typed JSON (never free-form numbers into the pipeline).
//
// Everything returned is an ESTIMATE from public info, provenance LLM_RESEARCH — NOT a licensed feed.
// Low effort + a deterministic-enough prompt keep it stable; temperature is intentionally NOT set
// (Opus 4.8 rejects sampling parameters). Citations are the ACTUAL retrieved web-search result URLs
// merged with the model's curated sources.
import Anthropic from '@anthropic-ai/sdk';
import type {
  FixtureResearchPort,
  FixtureResearchQuery,
  FixtureResearchBundle,
  ResearchFormEstimate,
  ResearchTeamStatsEstimate,
  ResearchH2HMeeting,
  ResearchOdds,
  SourceRef,
  MarketKey,
  IsoDateTime,
} from '@betvision/domain';
import { LLM_RESEARCH_PROVENANCE } from '@betvision/domain';
import { ANTHROPIC_MODEL_ID } from './anthropic-llm.adapter';

const SUBMIT_TOOL = 'submit_fixture_research';
const MAX_CONTINUATIONS = 4;

const RESEARCH_MARKETS: ReadonlyArray<MarketKey> = ['1X2', 'OU_2_5', 'BTTS'];
const RESULT_ENUM = ['W', 'D', 'L'] as const;

const SYSTEM_PROMPT = [
  'You are a meticulous football (soccer) DATA RESEARCHER for a responsible-gambling analytics product.',
  'Given a free-text fixture (e.g. "Portugal vs Spain"), you must:',
  '1. Use the web_search tool to find RECENT (last ~2 weeks) public information about the fixture:',
  '   the two teams (official names + country), each side\'s recent form (last 5 matches, MOST-RECENT',
  '   FIRST) with goals for/against, approximate rolling goal rates, xG, corners and cards averages,',
  '   clean sheets, the head-to-head record, and the APPROXIMATE current market odds (1X2, Over/Under',
  '   2.5 goals, and Both Teams To Score).',
  '2. Then call the `submit_fixture_research` tool EXACTLY ONCE with your best TYPED ESTIMATES.',
  'Rules:',
  '- Every number is an ESTIMATE from public info, NOT a licensed feed. Estimate sensibly; never leave',
  '  a required field blank. If information is thin, give your best public-info estimate and say so in',
  '  `notes` (lower confidence).',
  '- Report head-to-head meetings FROM THE CURRENT HOME TEAM\'S PERSPECTIVE: `homeGoals` = goals scored',
  '  by THIS fixture\'s home team in that meeting, `awayGoals` = goals scored by the other team.',
  '- Odds are decimal (> 1.0). Provide HOME/DRAW/AWAY for 1X2, OVER/UNDER for OU_2_5, YES/NO for BTTS.',
  '- Only cite URLs you actually retrieved via web_search. Do NOT fabricate sources.',
  '- Do NOT state probabilities or guarantees — a separate statistical model computes those.',
].join('\n');

/** JSON schema for the strict structured-output tool (no numeric min/max — strict-schema safe). */
const teamStatsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'avgGoalsFor',
    'avgGoalsAgainst',
    'avgXgFor',
    'avgXgAgainst',
    'avgCornersFor',
    'avgCornersAgainst',
    'avgCardsFor',
    'avgCardsAgainst',
    'cleanSheets',
  ],
  properties: {
    avgGoalsFor: { type: 'number' },
    avgGoalsAgainst: { type: 'number' },
    avgXgFor: { type: 'number' },
    avgXgAgainst: { type: 'number' },
    avgCornersFor: { type: 'number' },
    avgCornersAgainst: { type: 'number' },
    avgCardsFor: { type: 'number' },
    avgCardsAgainst: { type: 'number' },
    cleanSheets: { type: 'number' },
  },
};

const formSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['results', 'goalsFor', 'goalsAgainst'],
  properties: {
    results: { type: 'array', items: { type: 'string', enum: [...RESULT_ENUM] } },
    goalsFor: { type: 'array', items: { type: 'number' } },
    goalsAgainst: { type: 'array', items: { type: 'number' } },
  },
};

const SUBMIT_SCHEMA: Anthropic.Messages.Tool['input_schema'] = {
  type: 'object',
  additionalProperties: false,
  required: [
    'homeTeam',
    'awayTeam',
    'competition',
    'kickoffUtc',
    'homeForm',
    'awayForm',
    'homeStats',
    'awayStats',
    'headToHead',
    'odds',
    'sources',
    'notes',
  ],
  properties: {
    homeTeam: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'country'],
      properties: { name: { type: 'string' }, country: { type: 'string' } },
    },
    awayTeam: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'country'],
      properties: { name: { type: 'string' }, country: { type: 'string' } },
    },
    competition: { type: 'string' },
    kickoffUtc: { type: 'string', description: 'ISO-8601 UTC kickoff, or "unknown".' },
    homeForm: formSchema,
    awayForm: formSchema,
    homeStats: teamStatsSchema,
    awayStats: teamStatsSchema,
    headToHead: {
      type: 'object',
      additionalProperties: false,
      required: ['meetings', 'summary'],
      properties: {
        meetings: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['homeGoals', 'awayGoals'],
            properties: { homeGoals: { type: 'number' }, awayGoals: { type: 'number' } },
          },
        },
        summary: { type: 'string' },
      },
    },
    odds: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['market', 'selection', 'priceDecimal'],
        properties: {
          market: { type: 'string', enum: ['1X2', 'OU_2_5', 'BTTS'] },
          selection: {
            type: 'string',
            enum: ['HOME', 'DRAW', 'AWAY', 'OVER', 'UNDER', 'YES', 'NO'],
          },
          priceDecimal: { type: 'number' },
        },
      },
    },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'url'],
        properties: { label: { type: 'string' }, url: { type: 'string' } },
      },
    },
    notes: { type: 'string' },
  },
};

/** FNV-1a hex — deterministic provenance hashing, no node `crypto`. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export class AnthropicFixtureResearchProvider implements FixtureResearchPort {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string = ANTHROPIC_MODEL_ID,
    private readonly maxTokens = 4096,
    private readonly maxSearches = 6,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async research(query: FixtureResearchQuery): Promise<FixtureResearchBundle> {
    const tools: Anthropic.Messages.ToolUnion[] = [
      { type: 'web_search_20260209', name: 'web_search', max_uses: this.maxSearches },
      {
        name: SUBMIT_TOOL,
        description:
          'Submit the researched, TYPED estimates for the fixture. Call this EXACTLY ONCE after ' +
          'gathering evidence with web_search.',
        input_schema: SUBMIT_SCHEMA,
        strict: true,
      },
    ];

    const messages: Anthropic.Messages.MessageParam[] = [
      {
        role: 'user',
        content:
          `Fixture to research: "${query.query}".\n` +
          `Write the free-form fields (summary, notes) in ${langLabel(query.language)}.\n` +
          `Today is ${new Date().toISOString().slice(0, 10)}. Search the web for recent info, then ` +
          `call ${SUBMIT_TOOL} exactly once with your typed estimates and cited sources.`,
      },
    ];

    let response = await this.create(messages, tools, undefined);
    const searchSources: SourceRef[] = [];
    let submitted: unknown = null;

    for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
      collectSearchSources(response, searchSources);
      submitted = findSubmitInput(response);
      if (submitted !== null) break;

      if (response.stop_reason === 'pause_turn') {
        // Server-tool loop paused mid-search — echo the turn back to resume it.
        messages.push({ role: 'assistant', content: response.content });
        response = await this.create(messages, tools, undefined);
        continue;
      }

      // The model ended its turn without submitting — force the structured tool once.
      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content: `Now call ${SUBMIT_TOOL} once with your best typed estimates from the evidence above.`,
      });
      response = await this.create(messages, tools, { type: 'tool', name: SUBMIT_TOOL });
      collectSearchSources(response, searchSources);
      submitted = findSubmitInput(response);
      break;
    }

    if (submitted === null) {
      throw new Error(`Anthropic research did not produce a ${SUBMIT_TOOL} result for "${query.query}"`);
    }

    return this.toBundle(query.query, submitted, searchSources);
  }

  private create(
    messages: Anthropic.Messages.MessageParam[],
    tools: Anthropic.Messages.ToolUnion[],
    toolChoice: Anthropic.Messages.ToolChoice | undefined,
  ): Promise<Anthropic.Messages.Message> {
    return this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: SYSTEM_PROMPT,
      output_config: { effort: 'low' },
      tools,
      ...(toolChoice ? { tool_choice: toolChoice } : {}),
      messages,
    });
  }

  private toBundle(
    query: string,
    input: unknown,
    searchSources: ReadonlyArray<SourceRef>,
  ): FixtureResearchBundle {
    const o = asRecord(input);
    const homeTeam = asRecord(o['homeTeam']);
    const awayTeam = asRecord(o['awayTeam']);
    const modelSources = parseSources(o['sources']);

    const sources = mergeSources(searchSources, modelSources);

    return {
      query,
      home: { name: asString(homeTeam['name'], 'Home'), country: asNullableString(homeTeam['country']) },
      away: { name: asString(awayTeam['name'], 'Away'), country: asNullableString(awayTeam['country']) },
      competition: asNullableString(o['competition']),
      kickoffUtc: parseKickoff(o['kickoffUtc']),
      homeForm: parseForm(o['homeForm']),
      awayForm: parseForm(o['awayForm']),
      homeStats: parseStats(o['homeStats']),
      awayStats: parseStats(o['awayStats']),
      headToHead: parseH2H(o['headToHead']),
      odds: parseOdds(o['odds']),
      sources,
      notes: asString(o['notes'], ''),
      provenance: {
        provider: LLM_RESEARCH_PROVENANCE,
        fetchedAt: new Date().toISOString() as IsoDateTime,
        payloadHash: fnv1a(JSON.stringify(input)),
        ageMinutes: 0,
      },
    };
  }
}

// ---------------------------------------------------------------------------------------------
// Response reading (typed against the SDK content-block union).
// ---------------------------------------------------------------------------------------------

function collectSearchSources(message: Anthropic.Messages.Message, out: SourceRef[]): void {
  const seen = new Set(out.map((s) => s.url ?? s.label));
  for (const block of message.content) {
    if (block.type !== 'web_search_tool_result') continue;
    const content = block.content;
    if (!Array.isArray(content)) continue; // error object → skip
    for (const result of content) {
      if (result.type !== 'web_search_result') continue;
      if (seen.has(result.url)) continue;
      seen.add(result.url);
      out.push({ label: result.title || result.url, provider: LLM_RESEARCH_PROVENANCE, url: result.url });
    }
  }
}

function findSubmitInput(message: Anthropic.Messages.Message): unknown {
  for (const block of message.content) {
    if (block.type === 'tool_use' && block.name === SUBMIT_TOOL) return block.input;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Defensive parsing (LLM output is untrusted at the boundary; clamp into valid ranges).
// ---------------------------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}
function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}
function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}
function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function nonNegative(value: unknown, fallback: number): number {
  return Math.max(0, asNumber(value, fallback));
}

function parseKickoff(value: unknown): IsoDateTime | null {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? (new Date(parsed).toISOString() as IsoDateTime) : null;
}

function parseForm(value: unknown): ResearchFormEstimate {
  const o = asRecord(value);
  const rawResults = o['results'];
  const results = Array.isArray(rawResults)
    ? rawResults.filter((r): r is 'W' | 'D' | 'L' => r === 'W' || r === 'D' || r === 'L').slice(0, 10)
    : [];
  return { results, goalsFor: numberArray(o['goalsFor']), goalsAgainst: numberArray(o['goalsAgainst']) };
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map((n) => nonNegative(n, 0)).slice(0, 10)
    : [];
}

function parseStats(value: unknown): ResearchTeamStatsEstimate {
  const o = asRecord(value);
  return {
    avgGoalsFor: nonNegative(o['avgGoalsFor'], 1.3),
    avgGoalsAgainst: nonNegative(o['avgGoalsAgainst'], 1.3),
    avgXgFor: nonNegative(o['avgXgFor'], 1.3),
    avgXgAgainst: nonNegative(o['avgXgAgainst'], 1.3),
    avgCornersFor: nonNegative(o['avgCornersFor'], 5),
    avgCornersAgainst: nonNegative(o['avgCornersAgainst'], 5),
    avgCardsFor: nonNegative(o['avgCardsFor'], 2),
    avgCardsAgainst: nonNegative(o['avgCardsAgainst'], 2),
    cleanSheets: nonNegative(o['cleanSheets'], 0),
  };
}

function parseH2H(value: unknown): { meetings: ResearchH2HMeeting[]; summary: string } {
  const o = asRecord(value);
  const rawMeetings = o['meetings'];
  const meetings = Array.isArray(rawMeetings)
    ? rawMeetings
        .map((m) => {
          const r = asRecord(m);
          return { homeGoals: nonNegative(r['homeGoals'], 0), awayGoals: nonNegative(r['awayGoals'], 0) };
        })
        .slice(0, 10)
    : [];
  return { meetings, summary: asString(o['summary'], '') };
}

function parseOdds(value: unknown): ResearchOdds[] {
  if (!Array.isArray(value)) return [];
  const out: ResearchOdds[] = [];
  for (const item of value) {
    const r = asRecord(item);
    const market = r['market'];
    if (!RESEARCH_MARKETS.includes(market as MarketKey)) continue;
    const price = asNumber(r['priceDecimal'], 0);
    if (!(price > 1.01)) continue; // Odds VO requires > 1.0
    out.push({ market: market as MarketKey, selection: asString(r['selection'], ''), priceDecimal: price });
  }
  return out;
}

function parseSources(value: unknown): SourceRef[] {
  if (!Array.isArray(value)) return [];
  const out: SourceRef[] = [];
  for (const item of value) {
    const r = asRecord(item);
    const url = asNullableString(r['url']);
    const label = asString(r['label'], url ?? 'source');
    out.push({ label, provider: LLM_RESEARCH_PROVENANCE, ...(url ? { url } : {}) });
  }
  return out;
}

function mergeSources(a: ReadonlyArray<SourceRef>, b: ReadonlyArray<SourceRef>): SourceRef[] {
  const seen = new Set<string>();
  const out: SourceRef[] = [];
  for (const s of [...a, ...b]) {
    const key = s.url ?? s.label;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.slice(0, 12);
}

function langLabel(language: FixtureResearchQuery['language']): string {
  return language === 'es' ? 'Spanish' : 'English';
}
