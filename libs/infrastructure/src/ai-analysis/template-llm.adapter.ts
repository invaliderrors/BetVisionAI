// libs/infrastructure/src/ai-analysis/template-llm.adapter.ts
// LLM_MODE=dev (default) adapter — a DETERMINISTIC, clearly-labelled template/dev fallback. It
// implements LlmExplanationPort by delegating to the pure `renderTemplateNarrative` renderer, so it
// has NO API key and NO network. This is what runs and is tested here, and it is also the
// guaranteed guardrail-valid fallback GenerateReportUseCase drops to when a live narration fails.
import { Injectable } from '@nestjs/common';
import type {
  LlmExplanationPort,
  ExplanationRequest,
  ExplanationNarrative,
} from '@betvision/domain';
import { renderTemplateNarrative } from '@betvision/application';

@Injectable()
export class TemplateLlmAdapter implements LlmExplanationPort {
  async explain(request: ExplanationRequest): Promise<ExplanationNarrative> {
    return renderTemplateNarrative(request);
  }
}
