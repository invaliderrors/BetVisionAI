// libs/infrastructure/src/features/feature-pipeline.integration.spec.ts
// Integration tests against a REAL Postgres (compose `postgres` service). Requires DATABASE_URL;
// skips cleanly when it is absent so unit-only runs never hang.
//
// Proves (Phase 8 + 9):
//   - the SYNTHETIC dev seed inserts the expected rows and is IDEMPOTENT (counts stable across two
//     runs), all stamped with provenance DEV_SYNTHETIC;
//   - ComputeFeaturesUseCase builds a versioned/hashed FeatureVector from the seeded synthetic
//     stats via the real repositories + the deterministic dev providers;
//   - the exact vector persists as a PredictionInput (reproducibility).
import { PrismaClient } from '@prisma/client';
import {
  FEATURE_VERSION,
  type MatchId,
  type PredictionId,
} from '@betvision/domain';
import { ComputeFeaturesUseCase } from '@betvision/application';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaMatchRepository } from '../persistence/repositories/prisma-match.repository';
import { PrismaTeamRepository } from '../persistence/repositories/prisma-team.repository';
import { PrismaPredictionInputRepository } from './prisma-prediction-input.repository';
import { DevSportsDataProvider } from '../providers/dev/dev-sports-data.provider';
import { DevTeamStatsProvider } from '../providers/dev/dev-team-stats.provider';
import { seedDev, DEV_SYNTHETIC, type SeedDevCounts } from '../../prisma/seed-dev';

jest.setTimeout(60000);

const describeDb = process.env['DATABASE_URL'] ? describe : describe.skip;
const DEMO_MATCH_ID = 'dev-match-demo-1' as MatchId;

describeDb('Feature pipeline over synthetic dev seed (real Postgres)', () => {
  const prisma = new PrismaService();
  const rawClient = prisma as PrismaClient;
  const matchRepo = new PrismaMatchRepository(prisma);
  const teamRepo = new PrismaTeamRepository(prisma);
  const predictionInputRepo = new PrismaPredictionInputRepository(prisma);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    // Only clean the test-created prediction; the idempotent seed rows are meant to persist.
    await rawClient.prediction.deleteMany({ where: { matchId: DEMO_MATCH_ID as string } });
    await prisma.$disconnect();
  });

  describe('dev seed', () => {
    it('inserts synthetic rows and is IDEMPOTENT (counts stable across two runs)', async () => {
      const first: SeedDevCounts = await seedDev(rawClient);
      const second: SeedDevCounts = await seedDev(rawClient);

      expect(second).toEqual(first); // running twice does not change any count
      expect(first).toEqual({
        dataSources: 1,
        teams: 4,
        matches: 3,
        matchStats: 2,
        teamStats: 12,
        players: 2,
        playerStats: 2,
        oddsSnapshots: 7,
      });
    });

    it('stamps all seeded data with provenance DEV_SYNTHETIC', async () => {
      const source = await rawClient.dataSource.findUnique({ where: { name: DEV_SYNTHETIC } });
      expect(source).not.toBeNull();
      const teamsFromOtherSource = await rawClient.team.count({
        where: { id: { startsWith: 'dev-team-' }, NOT: { sourceId: source?.id } },
      });
      expect(teamsFromOtherSource).toBe(0);
    });
  });

  describe('ComputeFeaturesUseCase', () => {
    it('produces a versioned/hashed vector from the seeded synthetic stats', async () => {
      const useCase = new ComputeFeaturesUseCase({
        matches: matchRepo,
        teams: teamRepo,
        sportsData: new DevSportsDataProvider(),
        teamStats: new DevTeamStatsProvider(),
      });

      const result = await useCase.execute({ matchId: DEMO_MATCH_ID });
      if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
      const vector = result.value;

      expect(vector.matchId).toBe(DEMO_MATCH_ID);
      expect(vector.version).toBe(FEATURE_VERSION);
      expect(vector.snapshotHash).toMatch(/^[0-9a-f]{16}$/);
      // Home rolling avg comes from the seeded Riverside City home split (2.1) — cutoff-safe.
      expect(vector.features['home_avg_goals_for']).toBe(2.1);
      expect(vector.features['away_avg_goals_for']).toBe(1.6); // seeded Kingsford United
      expect(Object.keys(vector.features).length).toBeGreaterThanOrEqual(35);

      // deterministic: recompute with fresh instances -> byte-identical
      const again = await new ComputeFeaturesUseCase({
        matches: matchRepo,
        teams: teamRepo,
        sportsData: new DevSportsDataProvider(),
        teamStats: new DevTeamStatsProvider(),
      }).execute({ matchId: DEMO_MATCH_ID });
      if (!again.ok) throw new Error('expected ok');
      expect(JSON.stringify(again.value)).toBe(JSON.stringify(vector));
    });

    it('persists the exact vector as a PredictionInput (reproducibility)', async () => {
      const useCase = new ComputeFeaturesUseCase({
        matches: matchRepo,
        teams: teamRepo,
        sportsData: new DevSportsDataProvider(),
        teamStats: new DevTeamStatsProvider(),
        predictionInputs: predictionInputRepo,
      });

      const computed = await useCase.execute({ matchId: DEMO_MATCH_ID });
      if (!computed.ok) throw new Error('expected ok');

      const prediction = await rawClient.prediction.create({
        data: {
          matchId: DEMO_MATCH_ID as string,
          modelVersion: 'dev-features-only',
          inputSnapshotHash: computed.value.snapshotHash,
        },
      });

      await useCase.execute({
        matchId: DEMO_MATCH_ID,
        predictionId: prediction.id as PredictionId,
      });

      const persisted = await rawClient.predictionInput.findUnique({
        where: { predictionId: prediction.id },
      });
      expect(persisted).not.toBeNull();
      expect(persisted?.featureVersion).toBe(FEATURE_VERSION);
      const stored = persisted?.featuresJson as { snapshotHash?: string } | null;
      expect(stored?.snapshotHash).toBe(computed.value.snapshotHash);
    });
  });
});
