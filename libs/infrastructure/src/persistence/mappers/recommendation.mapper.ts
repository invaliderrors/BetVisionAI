// libs/infrastructure/src/persistence/mappers/recommendation.mapper.ts
// Persistence <-> domain translation for Recommendations (Phase 11). Pure functions, no IO.
// Prisma enums stay INTERNAL here; the port exchanges only domain shapes. The value math
// (edge/EV/stake) is NOT a column on `recommendations` — it lives on the linked PredictionResult —
// so this mapper carries only the gating outcome + RiskAppetite provenance.
import {
  ConfidenceLevel as PrismaConfidence,
  RiskLevel as PrismaRisk,
  RiskBucket as PrismaBucket,
  type Prisma,
} from '@prisma/client';
import {
  ConfidenceLevel,
  RiskLevel,
  RiskBucket,
  type RecommendationRecord,
  type PredictionId,
  type MarketKey,
} from '@betvision/domain';

const CONFIDENCE_TO_PRISMA: Readonly<Record<ConfidenceLevel, PrismaConfidence>> = {
  [ConfidenceLevel.Low]: PrismaConfidence.LOW,
  [ConfidenceLevel.Medium]: PrismaConfidence.MEDIUM,
  [ConfidenceLevel.High]: PrismaConfidence.HIGH,
};
const CONFIDENCE_FROM_PRISMA: Readonly<Record<PrismaConfidence, ConfidenceLevel>> = {
  [PrismaConfidence.LOW]: ConfidenceLevel.Low,
  [PrismaConfidence.MEDIUM]: ConfidenceLevel.Medium,
  [PrismaConfidence.HIGH]: ConfidenceLevel.High,
};
const RISK_TO_PRISMA: Readonly<Record<RiskLevel, PrismaRisk>> = {
  [RiskLevel.Low]: PrismaRisk.LOW,
  [RiskLevel.Medium]: PrismaRisk.MEDIUM,
  [RiskLevel.High]: PrismaRisk.HIGH,
};
const RISK_FROM_PRISMA: Readonly<Record<PrismaRisk, RiskLevel>> = {
  [PrismaRisk.LOW]: RiskLevel.Low,
  [PrismaRisk.MEDIUM]: RiskLevel.Medium,
  [PrismaRisk.HIGH]: RiskLevel.High,
};
const BUCKET_TO_PRISMA: Readonly<Record<RiskBucket, PrismaBucket>> = {
  [RiskBucket.Conservative]: PrismaBucket.CONSERVATIVE,
  [RiskBucket.Balanced]: PrismaBucket.BALANCED,
  [RiskBucket.Aggressive]: PrismaBucket.AGGRESSIVE,
};
const BUCKET_FROM_PRISMA: Readonly<Record<PrismaBucket, RiskBucket>> = {
  [PrismaBucket.CONSERVATIVE]: RiskBucket.Conservative,
  [PrismaBucket.BALANCED]: RiskBucket.Balanced,
  [PrismaBucket.AGGRESSIVE]: RiskBucket.Aggressive,
};

/** Minimal Prisma `recommendations` row shape this mapper consumes. */
export interface RecommendationRow {
  readonly predictionId: string;
  readonly marketKey: string;
  readonly selection: string;
  readonly rationale: string;
  readonly confidence: PrismaConfidence;
  readonly risk: PrismaRisk;
  readonly isBestBet: boolean;
  readonly riskAppetite: number;
  readonly riskBucket: PrismaBucket;
}

export function toDomainRecommendation(row: RecommendationRow): RecommendationRecord {
  return {
    predictionId: row.predictionId as PredictionId,
    market: row.marketKey as MarketKey,
    selection: row.selection,
    rationale: row.rationale,
    confidence: CONFIDENCE_FROM_PRISMA[row.confidence],
    risk: RISK_FROM_PRISMA[row.risk],
    isBestBet: row.isBestBet,
    riskAppetite: row.riskAppetite,
    riskBucket: BUCKET_FROM_PRISMA[row.riskBucket],
  };
}

export function toPersistenceRecommendation(
  record: RecommendationRecord,
): Prisma.RecommendationCreateManyInput {
  return {
    predictionId: record.predictionId as string,
    marketKey: record.market,
    selection: record.selection,
    rationale: record.rationale,
    confidence: CONFIDENCE_TO_PRISMA[record.confidence],
    risk: RISK_TO_PRISMA[record.risk],
    isBestBet: record.isBestBet,
    riskAppetite: record.riskAppetite,
    riskBucket: BUCKET_TO_PRISMA[record.riskBucket],
  };
}
