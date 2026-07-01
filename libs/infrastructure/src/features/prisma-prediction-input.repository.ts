// libs/infrastructure/src/features/prisma-prediction-input.repository.ts
// PredictionInputRepositoryPort adapter over Prisma. Persists the EXACT feature vector for a
// prediction (1:1 with `prediction_inputs`) so a prediction reproduces from its snapshot. Idempotent
// upsert by predictionId. Prisma stays internal — the port exchanges only domain types.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  PredictionInputRepositoryPort,
  PredictionInputRecord,
} from '@betvision/domain';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaPredictionInputRepository implements PredictionInputRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(record: PredictionInputRecord): Promise<void> {
    // Store the whole vector (features + snapshotHash + version) verbatim for reproducibility.
    // Round-trip through JSON to guarantee a plain, Prisma-serialisable JSON value.
    const featuresJson = JSON.parse(JSON.stringify(record.vector)) as Prisma.InputJsonValue;
    await this.prisma.predictionInput.upsert({
      where: { predictionId: record.predictionId as string },
      create: {
        predictionId: record.predictionId as string,
        featureVersion: record.featureVersion,
        featuresJson,
      },
      update: {
        featureVersion: record.featureVersion,
        featuresJson,
      },
    });
  }
}
