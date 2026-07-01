// libs/testing/src/fakes/fake-rag-retriever.ts
import type { RagRetrieverPort, RagQuery, RetrievedSnippet } from '@betvision/domain';

export class FakeRagRetriever implements RagRetrieverPort {
  private snippets: RetrievedSnippet[] = [];
  readonly queries: RagQuery[] = [];

  seed(snippets: RetrievedSnippet[]): this {
    this.snippets = snippets;
    return this;
  }

  async retrieve(query: RagQuery): Promise<ReadonlyArray<RetrievedSnippet>> {
    this.queries.push(query);
    const k = query.topK ?? this.snippets.length;
    return this.snippets.slice(0, k);
  }
}
