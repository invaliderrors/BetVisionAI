import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { AnalyzeView } from '../../../components/analyze-view';

// Authed, interactive, data-fetching page (reads `?q=`, calls POST /analyze, gated by RequireAuth).
// It has no business being statically prerendered — and Next 16's static export chokes on its
// client tree (`useContext of null`). Render it on demand instead; it works identically at runtime.
export const dynamic = 'force-dynamic';

export default async function AnalyzePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // AnalyzeView reads the optional `?q=` prefill via useSearchParams (client-side). Next 16 requires
  // a Suspense boundary around useSearchParams for the route to prerender; without it static export
  // throws `useContext of null`. The boundary keeps the page statically shipped, hydrating client-side.
  return (
    <Suspense fallback={null}>
      <AnalyzeView />
    </Suspense>
  );
}
