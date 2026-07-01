// apps/api/src/analyze/analyze-response.mapper.ts
// Maps the AnalyzeFixtureUseCase result onto the wire AnalyzeFixtureResponseDto. Pure shape
// translation: the numbers are reused verbatim via the existing prediction + report mappers, so the
// "analyze free-text" response is byte-consistent with POST /predictions + GET /reports.
import type { AnalyzeFixtureResult } from '@betvision/application';
import type { AnalyzeFixtureResponseDto } from '@betvision/contracts';
import { toPredictionResponse } from '../predictions/prediction-response.mapper';
import { toAnalysisReportDto } from '../reports/report-response.mapper';

export function toAnalyzeFixtureResponse(
  result: AnalyzeFixtureResult,
): AnalyzeFixtureResponseDto {
  return {
    query: result.query,
    resolvedFixture: {
      home: { name: result.fixture.home.name, country: result.fixture.home.country },
      away: { name: result.fixture.away.name, country: result.fixture.away.country },
      competition: result.fixture.competition,
      kickoffUtc: result.fixture.kickoffUtc,
    },
    prediction: toPredictionResponse(result.run, result.detect),
    report: toAnalysisReportDto(result.report.report),
    sources: result.sources.map((s) => ({
      label: s.label,
      provider: s.provider,
      ...(s.url !== undefined ? { url: s.url } : {}),
    })),
    disclaimer: result.disclaimer,
    aiEstimatedInputs: true,
    provenance: 'LLM_RESEARCH',
  };
}
