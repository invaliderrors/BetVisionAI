// libs/infrastructure/src/persistence/mappers/analysis-report.mapper.ts
// Persistence <-> domain translation for AnalysisReport (Phase 12). Pure functions, no IO. Prisma
// enums/Json stay INTERNAL here; the port exchanges only domain shapes. The `analysis_reports`
// table has no modelVersion column, so it is carried inside `contentJson` as an envelope alongside
// the structured sections.
import { Language as PrismaLanguage, RiskBucket as PrismaBucket, type Prisma } from '@prisma/client';
import {
  RiskBucket,
  type AnalysisReportRecord,
  type AnalysisReportContent,
  type SourceRef,
  type Locale,
  type MatchId,
  type PredictionId,
  type ReportId,
  type IsoDateTime,
} from '@betvision/domain';

const LANG_TO_PRISMA: Readonly<Record<Locale, PrismaLanguage>> = {
  en: PrismaLanguage.EN,
  es: PrismaLanguage.ES,
};
const LANG_FROM_PRISMA: Readonly<Record<PrismaLanguage, Locale>> = {
  [PrismaLanguage.EN]: 'en',
  [PrismaLanguage.ES]: 'es',
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

/** Envelope stored in `contentJson` (sections + non-columnar metadata). */
interface ContentEnvelope {
  readonly modelVersion: string;
  readonly content: AnalysisReportContent;
}

/** Minimal Prisma `analysis_reports` row shape this mapper consumes. */
export interface AnalysisReportRow {
  readonly id: string;
  readonly matchId: string;
  readonly predictionId: string;
  readonly language: PrismaLanguage;
  readonly contentJson: Prisma.JsonValue;
  readonly narrative: string;
  readonly sources: Prisma.JsonValue;
  readonly riskAppetite: number;
  readonly riskBucket: PrismaBucket;
  readonly createdAt: Date;
}

export function toPersistenceAnalysisReport(
  record: AnalysisReportRecord,
): Prisma.AnalysisReportUncheckedCreateInput {
  const envelope: ContentEnvelope = {
    modelVersion: record.modelVersion,
    content: record.content,
  };
  return {
    id: record.id as string,
    matchId: record.matchId as string,
    predictionId: record.predictionId as string,
    language: LANG_TO_PRISMA[record.language],
    contentJson: envelope as unknown as Prisma.InputJsonValue,
    narrative: record.narrative,
    sources: record.sources as unknown as Prisma.InputJsonValue,
    riskAppetite: record.riskAppetite,
    riskBucket: BUCKET_TO_PRISMA[record.riskBucket],
    createdAt: new Date(record.generatedAt),
  };
}

export function toDomainAnalysisReport(row: AnalysisReportRow): AnalysisReportRecord {
  const envelope = row.contentJson as unknown as ContentEnvelope;
  return {
    id: row.id as ReportId,
    matchId: row.matchId as MatchId,
    predictionId: row.predictionId as PredictionId,
    language: LANG_FROM_PRISMA[row.language],
    content: envelope.content,
    modelVersion: envelope.modelVersion,
    narrative: row.narrative,
    sources: row.sources as unknown as ReadonlyArray<SourceRef>,
    riskAppetite: row.riskAppetite,
    riskBucket: BUCKET_FROM_PRISMA[row.riskBucket],
    generatedAt: row.createdAt.toISOString() as IsoDateTime,
  };
}
