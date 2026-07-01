// libs/domain/src/ports/rag-retriever.port.ts
import type { Locale } from './shared.dto';
import type { SourceRef } from './llm-explanation.port';

export interface RagQuery {
  readonly query: string;
  readonly language: Locale;
  readonly topK?: number;
}
export interface RetrievedSnippet {
  readonly text: string;
  readonly score: number;
  readonly source: SourceRef;
}

export interface RagRetrieverPort {
  retrieve(query: RagQuery): Promise<ReadonlyArray<RetrievedSnippet>>;
}
