// libs/application/src/matches/resolve-fixture.use-case.ts
// Turn a free-text fixture query into RANKED match candidates with a confidence score.
//
// Flow: parse "A vs B" -> fuzzy-search teams for each side (trigram, via the port) ->
// find fixtures for the resolved team set -> score each fixture by how well its teams match
// the query -> rank by confidence. No confident candidate => NO_MATCH + team-name suggestions.
// Pure orchestration over the domain ports; the trigram SQL lives in the adapter.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import type {
  TeamRepositoryPort,
  MatchRepositoryPort,
  TeamSearchResult,
  MatchCandidate,
  TeamId,
  CompetitionId,
  IsoDateTime,
} from '@betvision/domain';
import type { MatchSearchResponse } from '@betvision/contracts';
import { parseFixtureText } from './fixture-text';
import { toMatchCandidateDto } from './match.mapper';

export interface ResolveFixtureCommand {
  readonly query: string;
  readonly competitionId?: CompetitionId;
  readonly dateFrom?: IsoDateTime;
  readonly dateTo?: IsoDateTime;
  readonly limit?: number;
}

const DEFAULT_LIMIT = 10;
const TEAM_SEARCH_LIMIT = 8;
/** Minimum combined team-name similarity for a fixture to count as a real match. */
const MIN_CONFIDENCE = 0.3;
const MAX_SUGGESTIONS = 5;

interface RankedCandidate {
  readonly candidate: MatchCandidate;
  readonly confidence: number;
}

export class ResolveFixtureUseCase {
  constructor(
    private readonly teams: TeamRepositoryPort,
    private readonly matches: MatchRepositoryPort,
  ) {}

  async execute(
    command: ResolveFixtureCommand,
  ): Promise<Result<MatchSearchResponse, DomainError>> {
    const parsed = parseFixtureText(command.query);
    if (!parsed) return err(DomainError.of(DomainErrorCode.FIXTURE_QUERY_EMPTY));

    const limit = command.limit ?? DEFAULT_LIMIT;

    const homeResults = await this.teams.searchByName(parsed.home, TEAM_SEARCH_LIMIT);
    const awayResults = parsed.away
      ? await this.teams.searchByName(parsed.away, TEAM_SEARCH_LIMIT)
      : [];

    const ranked =
      parsed.away === null
        ? await this.rankSingleSide(command, homeResults, limit)
        : await this.rankTeamPair(command, homeResults, awayResults, limit);

    if (ranked.length === 0) {
      return ok({
        query: command.query,
        candidates: [],
        suggestions: suggestionsFrom([...homeResults, ...awayResults]),
      });
    }

    return ok({
      query: command.query,
      candidates: ranked.map((r) => toMatchCandidateDto(r.candidate, r.confidence)),
      suggestions: [],
    });
  }

  /** Two-sided "A vs B": pair the resolved home/away sets and score both orientations. */
  private async rankTeamPair(
    command: ResolveFixtureCommand,
    homeResults: TeamSearchResult[],
    awayResults: TeamSearchResult[],
    limit: number,
  ): Promise<RankedCandidate[]> {
    const homeScore = toScoreMap(homeResults);
    const awayScore = toScoreMap(awayResults);
    const homeTeamIds = [...homeScore.keys()];
    const awayTeamIds = [...awayScore.keys()];
    if (homeTeamIds.length === 0 || awayTeamIds.length === 0) return [];

    const candidates = await this.matches.findByTeams({
      homeTeamIds,
      awayTeamIds,
      competitionId: command.competitionId,
      dateFrom: command.dateFrom,
      dateTo: command.dateTo,
      limit: limit * 3,
    });

    return rankCandidates(
      candidates,
      (c) => {
        const straight = mean(homeScore.get(c.home.id) ?? 0, awayScore.get(c.away.id) ?? 0);
        const swapped = mean(awayScore.get(c.home.id) ?? 0, homeScore.get(c.away.id) ?? 0);
        return Math.max(straight, swapped);
      },
      limit,
    );
  }

  /** One-sided "Barcelona": fixtures where either side is one of the resolved teams. */
  private async rankSingleSide(
    command: ResolveFixtureCommand,
    results: TeamSearchResult[],
    limit: number,
  ): Promise<RankedCandidate[]> {
    const score = toScoreMap(results);
    const anyTeamIds = [...score.keys()];
    if (anyTeamIds.length === 0) return [];

    const candidates = await this.matches.findByTeams({
      anyTeamIds,
      competitionId: command.competitionId,
      dateFrom: command.dateFrom,
      dateTo: command.dateTo,
      limit: limit * 3,
    });

    return rankCandidates(
      candidates,
      (c) => Math.max(score.get(c.home.id) ?? 0, score.get(c.away.id) ?? 0),
      limit,
    );
  }
}

function toScoreMap(results: TeamSearchResult[]): Map<TeamId, number> {
  const map = new Map<TeamId, number>();
  for (const result of results) {
    const previous = map.get(result.team.id);
    if (previous === undefined || result.score > previous) {
      map.set(result.team.id, result.score);
    }
  }
  return map;
}

function rankCandidates(
  candidates: MatchCandidate[],
  confidenceOf: (candidate: MatchCandidate) => number,
  limit: number,
): RankedCandidate[] {
  return candidates
    .map((candidate) => ({ candidate, confidence: round4(confidenceOf(candidate)) }))
    .filter((ranked) => ranked.confidence >= MIN_CONFIDENCE)
    .sort(
      (a, b) =>
        b.confidence - a.confidence ||
        a.candidate.kickoffUtc.localeCompare(b.candidate.kickoffUtc),
    )
    .slice(0, limit);
}

function suggestionsFrom(results: TeamSearchResult[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const result of [...results].sort((a, b) => b.score - a.score)) {
    if (!seen.has(result.team.name)) {
      seen.add(result.team.name);
      ordered.push(result.team.name);
    }
  }
  return ordered.slice(0, MAX_SUGGESTIONS);
}

function mean(a: number, b: number): number {
  return (a + b) / 2;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
