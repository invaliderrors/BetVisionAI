// libs/domain/src/ports/fixture-research.port.ts
// Outbound port for AI-ASSISTED fixture research (LLM_RESEARCH slice). Given a FREE-TEXT fixture
// query ("Portugal vs Spain") an adapter resolves the two teams, gathers RECENT public context
// (recent form, goal rates, head-to-head) and ESTIMATES the quantitative inputs the statistical
// feature pipeline needs, plus approximate current 1X2 / O-U 2.5 / BTTS market odds, together with
// the cited sources it grounded the estimates in.
//
// CRITICAL — everything returned here is an ESTIMATE from public information, provenance
// `LLM_RESEARCH`. It is NOT a licensed data feed and must NEVER be presented as guaranteed or as
// real, licensed data. The statistical model still computes the PROBABILITIES; this port only
// gathers + estimates the INPUTS. PURE interface: no framework / vendor imports.
import type { DataProvenance, IsoDateTime, Locale } from './shared.dto';
import type { MarketKey } from '../value-objects/market';
import type { SourceRef } from './llm-explanation.port';

/** Canonical provider/provenance name stamped on every research-sourced datum (AI-ESTIMATED). */
export const LLM_RESEARCH_PROVENANCE = 'LLM_RESEARCH';

/** A resolved team as identified from the free-text query. */
export interface ResearchTeamRef {
  readonly name: string;
  readonly country: string | null;
}

/** Recent-form estimate for one side. Arrays are MOST-RECENT-FIRST, aligned index-for-index. */
export interface ResearchFormEstimate {
  readonly results: ReadonlyArray<'W' | 'D' | 'L'>;
  readonly goalsFor: ReadonlyArray<number>;
  readonly goalsAgainst: ReadonlyArray<number>;
}

/** Rolling per-team averages estimated from public info (maps onto TeamStatsDto shape). */
export interface ResearchTeamStatsEstimate {
  readonly avgGoalsFor: number;
  readonly avgGoalsAgainst: number;
  readonly avgXgFor: number;
  readonly avgXgAgainst: number;
  readonly avgCornersFor: number;
  readonly avgCornersAgainst: number;
  readonly avgCardsFor: number;
  readonly avgCardsAgainst: number;
  readonly cleanSheets: number;
}

/** One prior meeting, scored FROM THE CURRENT HOME TEAM'S PERSPECTIVE (home = this fixture's home). */
export interface ResearchH2HMeeting {
  readonly homeGoals: number;
  readonly awayGoals: number;
}

/** One approximate current market price (decimal, > 1.0) for a selection. */
export interface ResearchOdds {
  readonly market: MarketKey;
  readonly selection: string;
  readonly priceDecimal: number;
}

/** The structured, typed research bundle returned for a free-text fixture query. */
export interface FixtureResearchBundle {
  /** Echo of the original free-text query. */
  readonly query: string;
  readonly home: ResearchTeamRef;
  readonly away: ResearchTeamRef;
  readonly competition: string | null;
  /** Best-known kickoff instant; null when the model could not establish one. */
  readonly kickoffUtc: IsoDateTime | null;
  readonly homeForm: ResearchFormEstimate;
  readonly awayForm: ResearchFormEstimate;
  readonly homeStats: ResearchTeamStatsEstimate;
  readonly awayStats: ResearchTeamStatsEstimate;
  readonly headToHead: {
    readonly meetings: ReadonlyArray<ResearchH2HMeeting>;
    readonly summary: string;
  };
  /** Approximate current market odds (typically 1X2 + O/U 2.5 + BTTS). */
  readonly odds: ReadonlyArray<ResearchOdds>;
  /** Cited sources the estimates were grounded in (provider LLM_RESEARCH). */
  readonly sources: ReadonlyArray<SourceRef>;
  /** Free-form confidence / caveat note from the researcher. */
  readonly notes: string;
  /** Where/when this bundle came from — provider is always LLM_RESEARCH. */
  readonly provenance: DataProvenance;
}

export interface FixtureResearchQuery {
  readonly query: string;
  readonly language: Locale;
}

/**
 * Outbound port: research a free-text fixture into a typed {@link FixtureResearchBundle}. Bound to
 * an Anthropic (web-search + structured-output) adapter under DATA_SOURCE_MODE=research, or a
 * deterministic dev adapter otherwise.
 */
export interface FixtureResearchPort {
  research(query: FixtureResearchQuery): Promise<FixtureResearchBundle>;
}
