// libs/infrastructure/src/persistence/repositories/prisma-prediction.repository.ts
// PredictionRepositoryPort adapter over Prisma (`predictions` table). Idempotent upsert by id.
// Prisma stays internal — the port exchanges only domain PredictionRecord shapes.
import { Injectable } from '@nestjs/common';
import type {
  PredictionRepositoryPort,
  PredictionRecord,
  PredictionId,
} from '@betvision/domain';
import { PrismaService } from '../../prisma/prisma.service';
import { toDomainPrediction, toPersistencePrediction } from '../mappers/prediction.mapper';

@Injectable()
export class PrismaPredictionRepository implements PredictionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(record: PredictionRecord): Promise<void> {
    const data = toPersistencePrediction(record);
    await this.prisma.prediction.upsert({
      where: { id: data.id as string },
      create: data,
      update: {
        matchId: data.matchId,
        modelVersion: data.modelVersion,
        inputSnapshotHash: data.inputSnapshotHash,
        requestedById: data.requestedById ?? null,
      },
    });
  }

  async findById(id: PredictionId): Promise<PredictionRecord | null> {
    const row = await this.prisma.prediction.findUnique({ where: { id: id as string } });
    return row ? toDomainPrediction(row) : null;
  }
}
