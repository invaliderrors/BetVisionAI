'use client';
// apps/web/src/components/match-analysis-view.tsx
// The Match Analysis page body: fixture header, the RiskSlider (default 33), an Analyze action,
// and the resulting prediction report. Analyze calls POST /predictions { matchId, riskAppetite }.
// Re-running after moving the slider re-calls with the new appetite — the model probabilities are
// identical (backend guarantee) so only the recommendations move. The call is SYNCHRONOUS today,
// so we show a stepper skeleton; a TODO marks the future async job + SSE progress.
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, Skeleton } from '@betvision/ui';
import { matchesApi, analysisApi } from '../lib/api';
import { errorSubKey } from '../lib/api/error-message';
import { Link } from '../i18n/navigation';
import { formatDateTime } from '../lib/format';
import { RiskAppetiteSlider } from './risk-appetite-slider';
import { PredictionReport } from './prediction-report';

const DEFAULT_RISK_APPETITE = 33;
const STEP_KEYS = ['ingest', 'features', 'predict', 'value', 'report'] as const;

export function MatchAnalysisView({ matchId }: { matchId: string }) {
  const locale = useLocale();
  const t = useTranslations('analysis');
  const tReport = useTranslations('analysis.report');
  const tErrors = useTranslations('errors');
  const [riskAppetite, setRiskAppetite] = useState(DEFAULT_RISK_APPETITE);

  const matchQuery = useQuery({
    queryKey: ['match', matchId, locale],
    queryFn: () => matchesApi.getMatch(matchId, locale),
  });

  const analysis = useMutation({
    mutationFn: (risk: number) =>
      analysisApi.createPrediction({ matchId, riskAppetite: risk }, locale),
  });

  const match = matchQuery.data;

  return (
    <div className="space-y-8">
      <Link
        href="/matches"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        {t('search.title')}
      </Link>

      {/* Fixture header */}
      {matchQuery.isLoading ? (
        <Card>
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-32" srLabel={t('report.loadingFixture')} />
            <Skeleton className="h-7 w-2/3" />
          </div>
        </Card>
      ) : matchQuery.isError || !match ? (
        <Card>
          <p role="alert" className="p-5 text-sm text-risk-high">
            {tErrors(errorSubKey(matchQuery.error))}
          </p>
        </Card>
      ) : (
        <Card eyebrow={t('report.fixtureEyebrow')}>
          <div className="p-5">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              <span>{match.home.name}</span>
              <span className="px-2 text-muted">{t('fixture.vs')}</span>
              <span>{match.away.name}</span>
            </h1>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <Fact label={t('fixture.competition')} value={match.competition.name} />
              <Fact
                label={t('fixture.kickoff')}
                value={formatDateTime(match.kickoffUtc, locale)}
              />
              <Fact
                label={t('fixture.venue')}
                value={match.venue ?? t('fixture.unknownVenue')}
              />
              <Fact
                label={t('fixture.referee')}
                value={match.referee?.name ?? t('fixture.unknownReferee')}
              />
            </dl>
          </div>
        </Card>
      )}

      {/* Risk appetite + Analyze */}
      {match ? (
        <Card eyebrow={t('slider.eyebrow')}>
          <div className="space-y-6 p-5">
            <RiskAppetiteSlider
              value={riskAppetite}
              onChange={setRiskAppetite}
              disabled={analysis.isPending}
            />
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <Button
                size="lg"
                loading={analysis.isPending}
                onClick={() => analysis.mutate(riskAppetite)}
              >
                {analysis.data ? tReport('reanalyzeCta') : tReport('analyzeCta')}
              </Button>
              <p className="text-xs text-muted">{tReport('stepsNote')}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Progress (synchronous today — TODO: async job + SSE stepper) */}
      {analysis.isPending ? (
        <Card eyebrow={tReport('analyzing')}>
          <div className="p-5">
            <ol className="flex flex-wrap gap-2" aria-label={tReport('analyzing')}>
              {STEP_KEYS.map((step) => (
                <li
                  key={step}
                  className="flex items-center gap-2 rounded-md border border-line px-3 py-2"
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-transparent"
                  />
                  <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-muted">
                    {tReport(`steps.${step}`)}
                  </span>
                </li>
              ))}
            </ol>
            <Skeleton className="mt-4 h-24 w-full" srLabel={tReport('analyzing')} />
          </div>
        </Card>
      ) : null}

      {/* Error */}
      {analysis.isError ? (
        <Card>
          <p
            role="alert"
            className="m-5 rounded-md border border-risk-high/40 bg-risk-high/10 px-3 py-2 text-sm text-risk-high"
          >
            {tErrors(errorSubKey(analysis.error))}
          </p>
        </Card>
      ) : null}

      {/* Report */}
      {match && analysis.data && !analysis.isPending ? (
        <PredictionReport match={match} result={analysis.data} />
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-eyebrow uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-fg">{value}</dd>
    </div>
  );
}
