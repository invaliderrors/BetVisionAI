// libs/testing/src/fakes/fake-injury-provider.ts
import type { InjuryProviderPort, InjuryDto, Provenanced, TeamId } from '@betvision/domain';
import { provenanced } from './provenance';

const PROVIDER = 'fake-injury';

export class FakeInjuryProvider implements InjuryProviderPort {
  private readonly byTeam = new Map<string, InjuryDto[]>();

  seed(teamId: TeamId, injuries: InjuryDto[]): this {
    this.byTeam.set(teamId, injuries);
    return this;
  }

  async getInjuries(teamId: TeamId): Promise<Provenanced<InjuryDto[]>> {
    return provenanced(PROVIDER, this.byTeam.get(teamId) ?? []);
  }
}
