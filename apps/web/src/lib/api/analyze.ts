// apps/web/src/lib/api/analyze.ts
// Typed client for POST /analyze — "analyze any free-text fixture" (Feature Spec B). The caller
// types a fixture ("Portugal vs Spain"); the server researches it live (web search + LLM) to
// ESTIMATE the quantitative inputs, then runs the SAME statistical pipeline and returns a
// bilingual, risk-graded recommendation + report + cited sources + an AI-ESTIMATED-inputs
// disclaimer. Validated against the shared zod contracts so FE + BE never drift.
import {
  analyzeFixtureRequestSchema,
  analyzeFixtureResponseDtoSchema,
  type AnalyzeFixtureRequest,
  type AnalyzeFixtureResponseDto,
} from '@betvision/contracts';
import { apiRequest } from './client';

export interface AnalyzeOptions {
  /** Lets the UI cancel a long-running research call (see the timeout note below). */
  signal?: AbortSignal;
}

/**
 * Analyze a free-text fixture at a risk appetite, in a language.
 *
 * SLOW BY DESIGN: when the server runs live research it does web search + an LLM pass, so this
 * call can take ~2–4 minutes. We deliberately set NO client-side fetch timeout — the browser keeps
 * the request open for the full duration — and instead expose an AbortSignal so the UI can offer a
 * Cancel control. Design the surrounding UX for a long-running request (progress + honest note).
 *
 * TODO(async job + SSE): move this behind a BullMQ job that returns a `jobId`, then poll / stream
 * (SSE) status with a stepper (resolve → research → model → value → report) so a dropped connection
 * no longer loses the run. Mirrors the same synchronous-today caveat in predictions.ts.
 * TODO(value-only re-run): re-running at a new riskAppetite currently re-runs research server-side;
 * a future endpoint should re-shape value ONLY against the cached model probabilities (cheap).
 */
export function analyzeFixture(
  body: AnalyzeFixtureRequest,
  locale?: string,
  options: AnalyzeOptions = {},
): Promise<AnalyzeFixtureResponseDto> {
  // Normalize against the shared contract (applies the default riskAppetite / language when omitted).
  const payload = analyzeFixtureRequestSchema.parse(body);
  return apiRequest('/analyze', {
    method: 'POST',
    body: payload,
    schema: analyzeFixtureResponseDtoSchema,
    locale,
    signal: options.signal,
  });
}
