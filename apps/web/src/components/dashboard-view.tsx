'use client';
// apps/web/src/components/dashboard-view.tsx
// Authenticated dashboard body: stat cards, recent predictions, upcoming fixtures, and the
// watchlist. The three data panels call typed clients whose endpoints are not shipped yet, so
// they resolve to empty and render honest empty states (with a "soon" note) rather than blocking.
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  Card,
  RiskBadge,
  Skeleton,
  StatCard,
  Table,
  type TableColumn,
} from '@betvision/ui';
import { predictionsApi } from '../lib/api';
import type {
  RecentPredictionSummary,
  UpcomingFixture,
  WatchlistItem,
} from '../lib/api/endpoints';
import { useAuthStore } from '../lib/auth/auth-store';
import { formatDateTime, formatPercent } from '../lib/format';
import { AnalyzeHero } from './analyze-hero';

function EmptyState({ message, soon }: { message: string; soon?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
      <p className="text-sm text-muted">{message}</p>
      {soon ? (
        <p className="font-mono text-eyebrow uppercase tracking-[0.14em] text-muted/70">
          {soon}
        </p>
      ) : null}
    </div>
  );
}

function PanelSkeleton() {
  const t = useTranslations('common');
  return (
    <div className="space-y-2 p-5">
      <Skeleton className="h-8 w-full" srLabel={t('loading')} />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-2/3" />
    </div>
  );
}

export function DashboardView() {
  const t = useTranslations('dashboard');
  const tRisk = useTranslations('risk');
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);

  const recent = useQuery({
    queryKey: ['recent-predictions', locale],
    queryFn: () => predictionsApi.getRecentPredictions(locale),
  });
  const upcoming = useQuery({
    queryKey: ['upcoming-fixtures', locale],
    queryFn: () => predictionsApi.getUpcomingFixtures(locale),
  });
  const watchlist = useQuery({
    queryKey: ['watchlist', locale],
    queryFn: () => predictionsApi.getWatchlist(locale),
  });

  const columns: TableColumn<RecentPredictionSummary>[] = [
    { key: 'match', header: t('table.match'), cell: (r) => r.matchLabel },
    { key: 'market', header: t('table.market'), cell: (r) => r.selection },
    {
      key: 'probability',
      header: t('table.probability'),
      numeric: true,
      cell: (r) => formatPercent(r.modelProbability, locale, 1),
    },
    {
      key: 'risk',
      header: t('table.risk'),
      cell: (r) => <RiskBadge level={r.risk} size="sm" label={tRisk(r.risk)} />,
    },
    {
      key: 'date',
      header: t('table.date'),
      numeric: true,
      cell: (r) => formatDateTime(r.createdAt, locale),
    },
  ];

  const localeName = useTranslations('localeName');

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-eyebrow uppercase tracking-[0.2em] text-muted">
          {t('eyebrow')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg">
          {t('greeting')}
          {user ? (
            <span className="text-muted"> · {user.email}</span>
          ) : null}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('subtitle')}</p>
      </header>

      {/* Prominent free-text "analyze any fixture" entry — the primary action on the dashboard. */}
      <AnalyzeHero />

      <section
        aria-label={t('eyebrow')}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <StatCard
          label={t('stats.predictionsRun')}
          value={(recent.data?.length ?? 0).toString()}
        />
        <StatCard
          label={t('stats.onWatchlist')}
          value={(watchlist.data?.length ?? 0).toString()}
        />
        <StatCard
          label={t('stats.languageLabel')}
          value={localeName(locale)}
          caption={t('stats.confidenceCaption')}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card eyebrow={t('sections.recentPredictions')}>
            {recent.isLoading ? (
              <PanelSkeleton />
            ) : (
              <Table<RecentPredictionSummary>
                columns={columns}
                rows={recent.data ?? []}
                rowKey={(r) => r.id}
                caption={t('sections.recentPredictions')}
                emptyState={
                  <EmptyState
                    message={t('empty.recentPredictions')}
                    soon={t('soon')}
                  />
                }
              />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card eyebrow={t('sections.upcoming')}>
            <PanelList
              isLoading={upcoming.isLoading}
              items={upcoming.data ?? []}
              empty={<EmptyState message={t('empty.upcoming')} soon={t('soon')} />}
              render={(f: UpcomingFixture) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <span className="text-fg">
                    {f.homeTeam} · {f.awayTeam}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {formatDateTime(f.kickoffUtc, locale)}
                  </span>
                </li>
              )}
            />
          </Card>

          <Card eyebrow={t('sections.watchlist')}>
            <PanelList
              isLoading={watchlist.isLoading}
              items={watchlist.data ?? []}
              empty={<EmptyState message={t('empty.watchlist')} soon={t('soon')} />}
              render={(w: WatchlistItem) => (
                <li key={w.id} className="px-5 py-3 text-sm text-fg">
                  {w.label}
                </li>
              )}
            />
          </Card>
        </div>
      </section>
    </div>
  );
}

function PanelList<Item>({
  isLoading,
  items,
  empty,
  render,
}: {
  isLoading: boolean;
  items: Item[];
  empty: ReactNode;
  render: (item: Item) => ReactNode;
}) {
  if (isLoading) return <PanelSkeleton />;
  if (items.length === 0) return <>{empty}</>;
  return <ul className="divide-y divide-line/60">{items.map(render)}</ul>;
}
