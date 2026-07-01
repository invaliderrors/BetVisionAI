'use client';
// apps/web/src/components/match-search-view.tsx
// Fixture typeahead. Debounces the query, calls GET /matches/search via the typed client, and
// renders ranked candidates with a match-confidence reading + disambiguation (competition +
// kick-off). On NO_MATCH it shows the resolver's closest-team suggestions instead of a dead end.
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search } from 'lucide-react';
import { Card, ConfidenceBar, Input, Skeleton } from '@betvision/ui';
import type { MatchCandidate } from '@betvision/contracts';
import { matchesApi } from '../lib/api';
import { errorSubKey } from '../lib/api/error-message';
import { Link } from '../i18n/navigation';
import { formatDateTime } from '../lib/format';
import { useDebouncedValue } from '../lib/hooks/use-debounced-value';

const MIN_QUERY_LENGTH = 2;

export function MatchSearchView() {
  const locale = useLocale();
  const t = useTranslations('analysis.search');
  const tErrors = useTranslations('errors');
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 300);
  const enabled = debounced.length >= MIN_QUERY_LENGTH;

  const search = useQuery({
    queryKey: ['matches-search', debounced, locale],
    queryFn: ({ signal }) =>
      matchesApi.searchMatches(debounced, locale, { signal, limit: 8 }),
    enabled,
  });

  const candidates = search.data?.candidates ?? [];
  const suggestions = search.data?.suggestions ?? [];
  const showNoMatch =
    enabled && search.isSuccess && candidates.length === 0;

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-eyebrow uppercase tracking-[0.2em] text-muted">
          {t('eyebrow')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg">
          {t('title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('subtitle')}</p>
      </header>

      <div className="relative max-w-xl">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-[2.15rem] h-4 w-4 text-muted"
        />
        <Input
          label={t('label')}
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder={t('placeholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
          hint={enabled ? undefined : t('hint')}
        />
      </div>

      {/* Results */}
      <section aria-label={t('resultsLabel')} aria-busy={search.isFetching || undefined}>
        {search.isError ? (
          <p
            role="alert"
            className="rounded-md border border-risk-high/40 bg-risk-high/10 px-3 py-2 text-sm text-risk-high"
          >
            {tErrors(errorSubKey(search.error))}
          </p>
        ) : enabled && search.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" srLabel={t('searching')} />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : showNoMatch ? (
          <Card>
            <div className="space-y-3 p-6">
              <p className="text-sm font-medium text-fg">{t('noMatch.title')}</p>
              <p className="max-w-prose text-sm text-muted">{t('noMatch.body')}</p>
              {suggestions.length > 0 ? (
                <div className="pt-2">
                  <p className="font-mono text-eyebrow uppercase tracking-[0.16em] text-muted">
                    {t('noMatch.suggestionsLabel')}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {suggestions.map((name) => (
                      <li
                        key={name}
                        className="rounded-full border border-line px-3 py-1 text-xs text-fg"
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Card>
        ) : candidates.length > 0 ? (
          <ul className="space-y-3">
            {candidates.map((candidate) => (
              <li key={candidate.matchId}>
                <CandidateRow candidate={candidate} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: MatchCandidate }) {
  const locale = useLocale();
  const t = useTranslations('analysis.search');

  return (
    <Card>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-fg">
            <span>{candidate.home.name}</span>
            <span className="px-2 text-muted">{t('vs')}</span>
            <span>{candidate.away.name}</span>
          </p>
          <p className="mt-1 font-mono text-xs text-muted">
            {candidate.competition.name} · {formatDateTime(candidate.kickoffUtc, locale)}
          </p>
        </div>

        <div className="flex items-center gap-5">
          <div className="w-36">
            <ConfidenceBar
              value={candidate.confidence * 100}
              label={t('confidence')}
              ariaLabel={t('confidenceAria')}
            />
          </div>
          <Link
            href={`/matches/${candidate.matchId}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm text-fg transition-colors hover:border-signal/50"
          >
            {t('analyze')}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
