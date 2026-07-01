// libs/domain/src/ports/analysis-report-repository.port.ts
// Outbound port for the immutable AnalysisReport (Phase 12). Maps onto the `analysis_reports`
// table. Reports are APPEND-ONLY: `save` inserts a new immutable row; there is no update. A given
// prediction may hold one report per language (re-rendered without recomputing numbers).
import type { Locale, PredictionId, ReportId } from './shared.dto';
import type { AnalysisReportRecord } from '../reports/analysis-report';

export interface AnalysisReportRepositoryPort {
  /** Insert a new immutable report row. */
  save(record: AnalysisReportRecord): Promise<void>;
  /** Load a report by its id (GET /reports/:id). */
  findById(id: ReportId): Promise<AnalysisReportRecord | null>;
  /** Latest report for a (prediction, language) pair — supports re-rendering the other language. */
  findLatest(predictionId: PredictionId, language: Locale): Promise<AnalysisReportRecord | null>;
}
