// libs/infrastructure/src/ai-analysis/dev-rag-retriever.ts
// RagRetrieverPort dev/stub adapter. Returns a small set of CURATED, CLEARLY-LABELLED dev source
// snippets so the report can cite something deterministically without a real corpus.
//
// DEFERRED: a real pgvector-backed retriever over a licensed, embedded corpus is a follow-up. Every
// snippet here is stamped provider 'dev-rag-stub' and is NOT real reporting — it exists so the
// guardrail's "must cite sources" check and the report's sources[] have deterministic input.
import { Injectable } from '@nestjs/common';
import type {
  RagRetrieverPort,
  RagQuery,
  RetrievedSnippet,
  Locale,
} from '@betvision/domain';

interface CuratedSnippet {
  readonly en: string;
  readonly es: string;
  readonly label: string;
  readonly score: number;
}

const CURATED: ReadonlyArray<CuratedSnippet> = [
  {
    label: 'Dev form digest (synthetic)',
    score: 0.92,
    en: 'Synthetic dev form digest: recent results and rolling xG for both sides, provided for demo purposes only.',
    es: 'Resumen de forma sintético para desarrollo: resultados recientes y xG móvil de ambos equipos, solo con fines de demostración.',
  },
  {
    label: 'Dev team-news note (synthetic)',
    score: 0.88,
    en: 'Synthetic dev team-news note: no confirmed injuries or suspensions in this demo dataset.',
    es: 'Nota sintética de novedades del equipo para desarrollo: sin lesiones ni sanciones confirmadas en este conjunto de datos de demostración.',
  },
  {
    label: 'Dev market context (synthetic)',
    score: 0.81,
    en: 'Synthetic dev market context: de-margined prices are stable across the demo book; treat as illustrative only.',
    es: 'Contexto de mercado sintético para desarrollo: los precios sin margen son estables en la casa de demostración; considérese solo ilustrativo.',
  },
];

@Injectable()
export class DevRagRetriever implements RagRetrieverPort {
  async retrieve(query: RagQuery): Promise<ReadonlyArray<RetrievedSnippet>> {
    const k = query.topK ?? CURATED.length;
    const lang: Locale = query.language;
    return CURATED.slice(0, k).map((s) => ({
      text: lang === 'es' ? s.es : s.en,
      score: s.score,
      source: {
        label: s.label,
        provider: 'dev-rag-stub',
        url: 'https://dev.local/rag/stub',
      },
    }));
  }
}
