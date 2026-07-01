// libs/application/src/competitions/list-competitions.use-case.ts
// List the competition catalog (GET /competitions).
import { Result, ok, DomainError } from '@betvision/shared';
import type { CompetitionRepositoryPort } from '@betvision/domain';
import type { CompetitionListResponse } from '@betvision/contracts';
import { toCompetitionDto } from './competition.mapper';

export class ListCompetitionsUseCase {
  constructor(private readonly competitions: CompetitionRepositoryPort) {}

  async execute(): Promise<Result<CompetitionListResponse, DomainError>> {
    const competitions = await this.competitions.list();
    return ok({ competitions: competitions.map(toCompetitionDto) });
  }
}
