// libs/infrastructure/src/persistence/repositories/prisma-prediction-result.repository.ts
// PredictionResultRepositoryPort adapter over Prisma (`prediction_results` table). Persists all
// results for a prediction in one transaction; idempotent by the (predictionId, marketKey,
// selection) unique key. Prisma stays internal — only domain records cross the boundary.
import { Injectable } from '@nestjs/common';
import type {
  PredictionResultRepositoryPort,
  PredictionResultRecord,
  PredictionId,
} from '@betvision/domain';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toDomainPredictionResult,
  toPersistencePredictionResult,
} from '../mappers/prediction.mapper';

@Injectable()
export class PrismaPredictionResultRepository implements PredictionResultRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async saveMany(records: ReadonlyArray<PredictionResultRecord>): Promise<void> {
    if (records.length === 0) return;
    // Upsert each row so re-running a prediction is idempotent on the natural key.
    await this.prisma.$transaction(
      records.map((record) => {
        const data = toPersistencePredictionResult(record);
        return this.prisma.predictionResult.upsert({
          where: {
            predictionId_marketKey_selection: {
              predictionId: data.predictionId as string,
              marketKey: data.marketKey,
              selection: data.selection,
            },
          },
          create: data,
          update: {
            modelProbability: data.modelProbability,
            impliedProbability: data.impliedProbability ?? null,
            edge: data.edge ?? null,
            expectedValue: data.expectedValue ?? null,
            suggestedStakePct: data.suggestedStakePct ?? null,
            confidence: data.confidence,
            risk: data.risk,
          },
        });
      }),
    );
  }

  async findByPrediction(predictionId: PredictionId): Promise<PredictionResultRecord[]> {
    const rows = await this.prisma.predictionResult.findMany({
      where: { predictionId: predictionId as string },
      orderBy: [{ marketKey: 'asc' }, { selection: 'asc' }],
    });
    return rows.map(toDomainPredictionResult);
  }
}
