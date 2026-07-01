// libs/application/src/reports/get-report.use-case.ts
// Phase 12 — read model for GET /reports/:id. Read-through Redis cache in front of the immutable
// Postgres row. Reports never change, so a cache hit is always authoritative.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import type {
  AnalysisReportRepositoryPort,
  AnalysisReportRecord,
  CachePort,
  ReportId,
} from '@betvision/domain';
import { reportIdCacheKey } from './generate-report.use-case';

const CACHE_TTL_SECONDS = 3600;

export interface GetReportQuery {
  readonly reportId: ReportId;
}

export interface GetReportDeps {
  readonly reports: AnalysisReportRepositoryPort;
  readonly cache: CachePort;
}

export class GetReportUseCase {
  constructor(private readonly deps: GetReportDeps) {}

  async execute(query: GetReportQuery): Promise<Result<AnalysisReportRecord, DomainError>> {
    const key = reportIdCacheKey(query.reportId as string);
    const cached = await this.deps.cache.get<AnalysisReportRecord>(key);
    if (cached) return ok(cached);

    const record = await this.deps.reports.findById(query.reportId);
    if (!record) {
      return err(DomainError.of(DomainErrorCode.REPORT_NOT_FOUND, { reportId: query.reportId }));
    }
    await this.deps.cache.set(key, record, CACHE_TTL_SECONDS);
    return ok(record);
  }
}
