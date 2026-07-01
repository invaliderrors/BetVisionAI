// libs/testing/src/fakes/fake-lineup-provider.ts
import type {
  LineupProviderPort,
  LineupDto,
  Provenanced,
  MatchId,
  TeamId,
} from '@betvision/domain';
import { provenanced } from './provenance';

const PROVIDER = 'fake-lineup';

export class FakeLineupProvider implements LineupProviderPort {
  private readonly byMatch = new Map<string, LineupDto>();

  seed(matchId: MatchId, lineup: LineupDto): this {
    this.byMatch.set(matchId, lineup);
    return this;
  }

  async getProbableLineup(matchId: MatchId): Promise<Provenanced<LineupDto>> {
    const dto: LineupDto = this.byMatch.get(matchId) ?? {
      matchId,
      teamId: 't-home' as TeamId,
      formation: '4-3-3',
      probableXi: [],
      confirmed: false,
    };
    return provenanced(PROVIDER, dto);
  }
}
