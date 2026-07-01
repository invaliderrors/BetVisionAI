// apps/web/src/components/prediction-report.tsx
// Presentational prediction report. Takes a resolved match + a PredictionResponseDto and renders:
//   - a summary header that ALWAYS states the risk the analysis ran at ("Analyzed at risk N/100
//     (bucket)") plus the reminder that higher risk = higher variance, not a guaranteed return;
//   - the market-probability table (objective model numbers, unchanged by the risk setting);
//   - the BEST BET card + alternatives, or an honest NO_VALUE_FOUND empty state.
// All copy is i18n-keyed; numbers are locale-formatted. No data fetching here (keeps it testable).
import { useLocale, useTranslations } from 'next-intl';
import {
  Card,
  RiskBadge,
  RiskMeter,
  RecommendationCard,
  Table,
  type RecommendationMetric,
  type TableColumn,
} from '@betvision/ui';
import type {
  PredictionResponseDto,
  PredictionResultDto,
  RecommendationDto,
} from '@betvision/contracts';
import { formatNumber } from '../lib/format';

const DASH = '—';

/**
 * Minimal fixture shape the report needs to render its header. A full `MatchDetailDto` (the
 * /matches flow) and the analyze flow's `resolvedFixture` both satisfy this structurally, so the
 * same report renders for a searched fixture and a free-text "analyze any fixture" result.
 */
export interface ReportFixture {
  home: { name: string };
  away: { name: string };
}

export interface PredictionReportProps {
  match: ReportFixture;
  result: PredictionResponseDto;
}

export function PredictionReport({ match, result }: PredictionReportProps) {
  const locale = useLocale();
  const t = useTranslations('analysis.report');
  const tTable = useTranslations('analysis.report.table');
  const tMetrics = useTranslations('analysis.report.metrics');
  const tRisk = useTranslations('risk');
  const tConf = useTranslations('analysis.confidence');
  const tMarkets = useTranslations('analysis.markets');
  const tRationale = useTranslations('analysis.report.rationale');
  const tBuckets = useTranslations('analysis.slider.buckets');
  const tFooter = useTranslations('footer');

  const bucketLabel = tBuckets(`${result.riskBucket}.label`);
  const marketLabel = (key: string) => (tMarkets.has(key) ? tMarkets(key) : key);
  const confidenceLabel = (level: 'low' | 'medium' | 'high') => tConf(level);
  const rationaleText = (code: string) =>
    tRationale.has(code) ? tRationale(code) : tRationale('default');

  const pct = (value: number | null, digits = 1) =>
    value == null ? DASH : formatPercent(value, locale, digits);
  const signedPct = (value: number | null, digits = 1) =>
    value == null ? DASH : formatSignedPercent(value, locale, digits);
  const signedNum = (value: number | null, digits = 2) =>
    value == null ? DASH : formatSignedNumber(value, locale, digits);
  const stake = (value: number | null) =>
    value == null
      ? DASH
      : `${formatNumber(value, locale, { maximumFractionDigits: 2 })}%`;
  const odds = (value: number | null) =>
    value == null
      ? DASH
      : formatNumber(value, locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  const columns: TableColumn<PredictionResultDto>[] = [
    { key: 'market', header: tTable('market'), cell: (r) => marketLabel(r.market) },
    { key: 'selection', header: tTable('selection'), cell: (r) => r.selection },
    {
      key: 'model',
      header: tTable('model'),
      numeric: true,
      cell: (r) => pct(r.modelProbability),
    },
    {
      key: 'implied',
      header: tTable('implied'),
      numeric: true,
      cell: (r) => pct(r.impliedProbability),
    },
    {
      key: 'edge',
      header: tTable('edge'),
      numeric: true,
      cell: (r) => signedPct(r.edge),
    },
    {
      key: 'ev',
      header: tTable('ev'),
      numeric: true,
      cell: (r) => signedNum(r.expectedValue),
    },
    {
      key: 'confidence',
      header: tTable('confidence'),
      cell: (r) => (
        <span className="font-mono text-eyebrow uppercase tracking-[0.12em] text-muted">
          {confidenceLabel(r.confidence)}
        </span>
      ),
    },
    {
      key: 'risk',
      header: tTable('risk'),
      cell: (r) => <RiskBadge level={r.risk} size="sm" label={tRisk(r.risk)} />,
    },
  ];

  const alternatives = result.recommendations.filter((r) => !r.isBestBet);

  const metricsFor = (rec: RecommendationDto): RecommendationMetric[] => [
    { key: 'model', label: tMetrics('model'), value: pct(rec.modelProbability) },
    { key: 'odds', label: tMetrics('odds'), value: odds(rec.oddsDecimal) },
    { key: 'edge', label: tMetrics('edge'), value: signedPct(rec.edge) },
    { key: 'ev', label: tMetrics('ev'), value: signedNum(rec.expectedValue) },
    { key: 'rev', label: tMetrics('rev'), value: signedNum(rec.riskAdjustedExpectedValue) },
    { key: 'stake', label: tMetrics('stake'), value: stake(rec.suggestedStakePct) },
  ];

  const renderRecommendation = (rec: RecommendationDto) => (
    <RecommendationCard
      key={`${rec.market}-${rec.selection}`}
      title={marketLabel(rec.market)}
      selection={rec.selection}
      isBestBet={rec.isBestBet}
      bestBetLabel={t('bestBetBadge')}
      metrics={metricsFor(rec)}
      confidenceSlot={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-mono text-eyebrow uppercase tracking-[0.14em] text-muted">
          {tConf('label')}: {confidenceLabel(rec.confidence)}
        </span>
      }
      riskSlot={<RiskBadge level={rec.risk} size="sm" label={tRisk(rec.risk)} />}
      rationale={rationaleText(rec.rationaleCode)}
    />
  );

  return (
    <div className="space-y-8">
      {/* Summary — the risk level and the variance reminder are stated up front, every time. */}
      <Card eyebrow={t('summaryEyebrow')}>
        <div className="grid gap-6 p-5 sm:grid-cols-[1.4fr_1fr] sm:items-start">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-fg">
              <span>{match.home.name}</span>
              <span className="px-2 text-muted">{DASH}</span>
              <span>{match.away.name}</span>
            </h2>
            <p className="mt-2 text-sm font-medium text-fg">
              {t('analyzedAt', {
                value: result.riskAppetite,
                max: 100,
                bucket: bucketLabel,
              })}
            </p>
            <p className="mt-2 max-w-prose text-xs text-muted">
              {t('varianceReminder')}
            </p>
            <p className="mt-3 font-mono text-eyebrow uppercase tracking-[0.14em] text-muted/70">
              {t('modelVersion', { version: result.modelVersion })}
            </p>
          </div>

          <RiskMeter
            value={result.riskAppetite}
            label={t('riskMeterLabel')}
            bucketLabel={bucketLabel}
            ariaLabel={t('riskMeterAria')}
            valueText={t('analyzedAt', {
              value: result.riskAppetite,
              max: 100,
              bucket: bucketLabel,
            })}
          />
        </div>
      </Card>

      {/* Market probabilities — objective, and explicitly unchanged by the risk setting. */}
      <section aria-label={t('marketsEyebrow')}>
        <Card eyebrow={t('marketsEyebrow')}>
          <div className="p-2">
            <Table<PredictionResultDto>
              columns={columns}
              rows={result.results}
              rowKey={(r) => `${r.market}-${r.selection}`}
              caption={t('marketsEyebrow')}
              emptyState={
                <p className="text-sm text-muted">{tTable('empty')}</p>
              }
            />
          </div>
          <p className="border-t border-line px-5 py-3 text-xs text-muted">
            {t('marketsCaption')}
          </p>
        </Card>
      </section>

      {/* Recommendations — best bet + alternatives, or an honest empty state. */}
      {result.noValueFound || result.recommendations.length === 0 ? (
        <section aria-label={t('bestBetEyebrow')}>
          <Card eyebrow={t('bestBetEyebrow')}>
            <div className="space-y-2 p-6 text-center">
              <p className="text-sm font-medium text-fg">{t('noValue.title')}</p>
              <p className="mx-auto max-w-prose text-sm text-muted">
                {t('noValue.body')}
              </p>
              <p className="mx-auto max-w-prose text-xs text-muted">
                {t('noValue.hint')}
              </p>
            </div>
          </Card>
        </section>
      ) : (
        <section aria-label={t('bestBetEyebrow')} className="space-y-6">
          {result.bestBet ? (
            <div>
              <p className="mb-3 font-mono text-eyebrow uppercase tracking-[0.18em] text-muted">
                {t('bestBetEyebrow')}
              </p>
              {renderRecommendation(result.bestBet)}
            </div>
          ) : null}

          {alternatives.length > 0 ? (
            <div>
              <p className="mb-3 font-mono text-eyebrow uppercase tracking-[0.18em] text-muted">
                {t('alternativesEyebrow')}
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                {alternatives.map(renderRecommendation)}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {/* Persistent responsible-gambling disclaimer inside the report body. The variance
          reminder is already stated up front in the summary; here we close with the standing
          "not financial advice / no guaranteed results" note. */}
      <p className="border-t border-line pt-4 text-xs text-muted">
        {tFooter('disclaimer')}
      </p>
    </div>
  );
}

/** Locale-aware helpers kept local so the report formats every figure consistently. */
function formatPercent(
  probability: number,
  locale: string,
  fractionDigits: number,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(probability);
}

function formatSignedPercent(
  value: number,
  locale: string,
  fractionDigits: number,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function formatSignedNumber(
  value: number,
  locale: string,
  fractionDigits: number,
): string {
  return new Intl.NumberFormat(locale, {
    signDisplay: 'exceptZero',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
