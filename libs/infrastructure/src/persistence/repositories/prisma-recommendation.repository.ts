// libs/infrastructure/src/persistence/repositories/prisma-recommendation.repository.ts
// RecommendationRepositoryPort adapter over Prisma (`recommendations` table). `replaceForPrediction`
// swaps the set for one (prediction, riskAppetite) atomically so re-analysing the same fixture at
// the same appetite leaves a single current set (idempotent). Prisma stays internal — only domain
// records cross the boundary.
import { Injectable } from '@nestjs/common';
import type {
  RecommendationRepositoryPort,
  RecommendationRecord,
  PredictionId,
} from '@betvision/domain';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toDomainRecommendation,
  toPersistenceRecommendation,
} from '../mappers/recommendation.mapper';

@Injectable()
export class PrismaRecommendationRepository implements RecommendationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async replaceForPrediction(
    predictionId: PredictionId,
    riskAppetite: number,
    records: ReadonlyArray<RecommendationRecord>,
  ): Promise<void> {
    const del = this.prisma.recommendation.deleteMany({
      where: { predictionId: predictionId as string, riskAppetite },
    });
    if (records.length === 0) {
      await del;
      return;
    }
    await this.prisma.$transaction([
      del,
      this.prisma.recommendation.createMany({
        data: records.map(toPersistenceRecommendation),
      }),
    ]);
  }

  async findByPrediction(predictionId: PredictionId): Promise<RecommendationRecord[]> {
    const rows = await this.prisma.recommendation.findMany({
      where: { predictionId: predictionId as string },
      orderBy: [{ isBestBet: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map(toDomainRecommendation);
  }
}
