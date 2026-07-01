// apps/web/src/lib/api/predictions.ts
// Typed prediction / value-betting calls (Phase 11 + 14). Validated against the shared zod
// contracts. POST /predictions runs the model and then shapes recommendations by RiskAppetite
// (Feature Spec B) — the model probabilities are objective and never change with the risk setting.
import {
  createPredictionRequestSchema,
  predictionResponseDtoSchema,
  predictionDetailDtoSchema,
  type CreatePredictionRequest,
  type PredictionResponseDto,
  type PredictionDetailDto,
} from '@betvision/contracts';
import { apiRequest } from './client';

/**
 * Run a prediction for a fixture at a given risk appetite.
 *
 * TODO(async job + SSE): POST /predictions is SYNCHRONOUS today — it returns the full result
 * inline. When the backend moves this behind a BullMQ job, switch to returning a `jobId` and
 * poll / subscribe (SSE) on status with a stepper (ingest → features → predict → value → report).
 */
export function createPrediction(
  body: CreatePredictionRequest,
  locale?: string,
): Promise<PredictionResponseDto> {
  // Normalize against the shared contract (applies the default riskAppetite when omitted).
  const payload = createPredictionRequestSchema.parse(body);
  return apiRequest('/predictions', {
    method: 'POST',
    body: payload,
    schema: predictionResponseDtoSchema,
    locale,
  });
}

/**
 * Fetch a stored prediction + its recommendation set.
 *
 * TODO(value-only re-run): a future endpoint should re-run ONLY value detection against the
 * cached model probabilities for a new riskAppetite (cheap), without re-scoring the model. Until
 * it lands, re-analysis re-calls POST /predictions — the backend guarantees identical model
 * probabilities regardless of risk, so only the recommendations move.
 */
export function getPrediction(
  id: string,
  locale?: string,
): Promise<PredictionDetailDto> {
  return apiRequest(`/predictions/${encodeURIComponent(id)}`, {
    method: 'GET',
    schema: predictionDetailDtoSchema,
    locale,
  });
}
