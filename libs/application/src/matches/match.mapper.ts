// libs/application/src/matches/match.mapper.ts
// Domain read models -> contract DTO translation for the match read side.
import type { MatchCandidate, MatchDetailView } from '@betvision/domain';
import type {
  MatchCandidate as MatchCandidateDto,
  MatchDetailDto,
} from '@betvision/contracts';
import { toTeamRefDto } from '../teams/team.mapper';
import { toCompetitionRefDto } from '../competitions/competition.mapper';

export function toMatchCandidateDto(
  candidate: MatchCandidate,
  confidence: number,
): MatchCandidateDto {
  return {
    matchId: candidate.matchId,
    home: toTeamRefDto(candidate.home),
    away: toTeamRefDto(candidate.away),
    competition: toCompetitionRefDto(candidate.competition),
    kickoffUtc: candidate.kickoffUtc,
    status: candidate.status,
    confidence,
  };
}

export function toMatchDetailDto(view: MatchDetailView): MatchDetailDto {
  return {
    id: view.matchId,
    home: toTeamRefDto(view.home),
    away: toTeamRefDto(view.away),
    competition: toCompetitionRefDto(view.competition),
    seasonId: view.seasonId,
    seasonLabel: view.seasonLabel,
    kickoffUtc: view.kickoffUtc,
    status: view.status,
    venue: view.venue,
    round: view.round,
    importance: view.importance,
    referee: view.referee ? { id: view.referee.id, name: view.referee.name } : null,
    stats: view.stats ? { ...view.stats } : null,
    // Placeholder until the odds/value phase (Phase 11) populates a real summary.
    oddsSummary: { available: false },
  };
}
