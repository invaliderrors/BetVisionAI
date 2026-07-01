// libs/infrastructure/src/persistence/mappers/prediction.mapper.ts
// Persistence <-> domain translation for Prediction runs + per-market results. Pure functions,
// no IO. Prisma types (Decimal, enums) stay INTERNAL here; the ports exchange only domain shapes.
//
// Probabilities are persisted as Decimal (schema: Decimal(6,5)) so the stored value is a stable,
// reproducible 5-dp figure independent of float formatting — two identical model runs round-trip
// to byte-identical rows.
import {
  Prisma,
  ConfidenceLevel as PrismaConfidence,
  RiskLevel as PrismaRisk,
} from '@prisma/client';
import {
  ConfidenceLevel,
  RiskLevel,
  type PredictionRecord,
  type PredictionResultRecord,
  type PredictionId,
  type MatchId,
  type UserId,
  type MarketKey,
} from '@betvision/domain';

// --- enum bridges (domain lowercase <-> Prisma UPPERCASE) ------------------------------------

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

const toNumber = (value: Prisma.Decimal | number | string | null): number | undefined => {
  if (value === null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return value.toNumber();
};

const toDecimal = (value: number | undefined): Prisma.Decimal | null =>
  value === undefined ? null : new Prisma.Decimal(value);

// --- Prediction ------------------------------------------------------------------------------

/** Minimal Prisma `predictions` row shape this mapper consumes. */
export interface PredictionRow {
  readonly id: string;
  readonly matchId: string;
  readonly modelVersion: string;
  readonly inputSnapshotHash: string;
  readonly requestedById: string | null;
}

export function toDomainPrediction(row: PredictionRow): PredictionRecord {
  return {
    id: row.id as PredictionId,
    matchId: row.matchId as MatchId,
    modelVersion: row.modelVersion,
    inputSnapshotHash: row.inputSnapshotHash,
    requestedById: row.requestedById ? (row.requestedById as UserId) : undefined,
  };
}

export function toPersistencePrediction(
  record: PredictionRecord,
): Prisma.PredictionUncheckedCreateInput {
  return {
    id: record.id as string,
    matchId: record.matchId as string,
    modelVersion: record.modelVersion,
    inputSnapshotHash: record.inputSnapshotHash,
    requestedById: record.requestedById ? (record.requestedById as string) : null,
  };
}

// --- PredictionResult ------------------------------------------------------------------------

/** Minimal Prisma `prediction_results` row shape this mapper consumes. */
export interface PredictionResultRow {
  readonly predictionId: string;
  readonly marketKey: string;
  readonly selection: string;
  readonly modelProbability: Prisma.Decimal | number | string;
  readonly impliedProbability: Prisma.Decimal | number | string | null;
  readonly edge: Prisma.Decimal | number | string | null;
  readonly expectedValue: Prisma.Decimal | number | string | null;
  readonly suggestedStakePct: Prisma.Decimal | number | string | null;
  readonly confidence: PrismaConfidence;
  readonly risk: PrismaRisk;
}

export function toDomainPredictionResult(row: PredictionResultRow): PredictionResultRecord {
  return {
    predictionId: row.predictionId as PredictionId,
    market: row.marketKey as MarketKey,
    selection: row.selection,
    modelProbability: toNumber(row.modelProbability) ?? 0,
    impliedProbability: toNumber(row.impliedProbability),
    edge: toNumber(row.edge),
    expectedValue: toNumber(row.expectedValue),
    suggestedStakePct: toNumber(row.suggestedStakePct),
    confidence: CONFIDENCE_FROM_PRISMA[row.confidence],
    risk: RISK_FROM_PRISMA[row.risk],
  };
}

export function toPersistencePredictionResult(
  record: PredictionResultRecord,
): Prisma.PredictionResultUncheckedCreateInput {
  return {
    predictionId: record.predictionId as string,
    marketKey: record.market,
    selection: record.selection,
    modelProbability: new Prisma.Decimal(record.modelProbability),
    impliedProbability: toDecimal(record.impliedProbability),
    edge: toDecimal(record.edge),
    expectedValue: toDecimal(record.expectedValue),
    suggestedStakePct: toDecimal(record.suggestedStakePct),
    confidence: CONFIDENCE_TO_PRISMA[record.confidence],
    risk: RISK_TO_PRISMA[record.risk],
  };
}
