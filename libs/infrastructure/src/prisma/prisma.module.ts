// libs/infrastructure/src/prisma/prisma.module.ts
// @Global so the single PrismaService (connection pool) and the repository adapters
// are available app-wide without re-importing. Repositories are bound to the domain
// DI tokens (MATCH_REPOSITORY / TEAM_REPOSITORY / COMPETITION_REPOSITORY / ODDS_REPOSITORY)
// so use-cases depend on the PORT, not the Prisma adapter.
import { Global, Module } from '@nestjs/common';
import {
  MATCH_REPOSITORY,
  TEAM_REPOSITORY,
  COMPETITION_REPOSITORY,
  ODDS_REPOSITORY,
} from '@betvision/domain';
import { PrismaService } from './prisma.service';
import { PrismaMatchRepository } from '../persistence/repositories/prisma-match.repository';
import { PrismaTeamRepository } from '../persistence/repositories/prisma-team.repository';
import { PrismaCompetitionRepository } from '../persistence/repositories/prisma-competition.repository';
import { PrismaOddsRepository } from '../persistence/repositories/prisma-odds.repository';

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: MATCH_REPOSITORY, useClass: PrismaMatchRepository },
    { provide: TEAM_REPOSITORY, useClass: PrismaTeamRepository },
    { provide: COMPETITION_REPOSITORY, useClass: PrismaCompetitionRepository },
    { provide: ODDS_REPOSITORY, useClass: PrismaOddsRepository },
  ],
  exports: [
    PrismaService,
    MATCH_REPOSITORY,
    TEAM_REPOSITORY,
    COMPETITION_REPOSITORY,
    ODDS_REPOSITORY,
  ],
})
export class PrismaModule {}
