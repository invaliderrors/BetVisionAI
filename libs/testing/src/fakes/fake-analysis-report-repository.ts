// libs/testing/src/fakes/fake-analysis-report-repository.ts
// In-memory AnalysisReportRepositoryPort. Reports are immutable/append-only, so `save` just pushes.
import type {
  AnalysisReportRepositoryPort,
  AnalysisReportRecord,
  Locale,
  PredictionId,
  ReportId,
} from '@betvision/domain';

export class FakeAnalysisReportRepository implements AnalysisReportRepositoryPort {
  readonly saved: AnalysisReportRecord[] = [];

  async save(record: AnalysisReportRecord): Promise<void> {
    this.saved.push(record);
  }

  async findById(id: ReportId): Promise<AnalysisReportRecord | null> {
    return this.saved.find((r) => r.id === id) ?? null;
  }

  async findLatest(
    predictionId: PredictionId,
    language: Locale,
  ): Promise<AnalysisReportRecord | null> {
    const matches = this.saved.filter(
      (r) => r.predictionId === predictionId && r.language === language,
    );
    return matches.length > 0 ? matches[matches.length - 1] : null;
  }
}
