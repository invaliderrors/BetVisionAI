// apps/web/src/components/analyze-report.tsx
// Presentational result view for POST /analyze (free-text "analyze any fixture"). It renders, in
// order: an UNMISSABLE AI-ESTIMATED-inputs disclaimer + responsible-gambling warning (this is live
// research, NOT a licensed feed); the resolved fixture; the AI narrative (summary / reasoning /
// key data points / risks); the calibrated numbers (reusing PredictionReport — market table, best
// bet, risk meter, variance reminder); and the cited SOURCES with clickable, audit-able links.
// The disclaimer + RG warning + sources prose come back from the server already in the requested
// language; everything else is i18n-keyed. No data fetching here (keeps it testable).
import { useLocale, useTranslations } from 'next-intl';
import { TriangleAlert, ExternalLink } from 'lucide-react';
import { Card } from '@betvision/ui';
import type { AnalyzeFixtureResponseDto } from '@betvision/contracts';
import { formatDateTime } from '../lib/format';
import { PredictionReport } from './prediction-report';

const DASH = '—';

export interface AnalyzeReportProps {
  response: AnalyzeFixtureResponseDto;
}

export function AnalyzeReport({ response }: AnalyzeReportProps) {
  const locale = useLocale();
  const t = useTranslations('analyze.result');
  const { resolvedFixture, report, sources, prediction } = response;

  const kickoff = resolvedFixture.kickoffUtc
    ? formatDateTime(resolvedFixture.kickoffUtc, locale)
    : t('unknownKickoff');
  const competition = resolvedFixture.competition ?? t('unknownCompetition');

  return (
    <div className="space-y-8">
      {/* AI-ESTIMATED-INPUTS DISCLAIMER — deliberately the first thing read. Amber "caution"
          accent (never error-red, never celebratory), a warning glyph, and the server-authored
          disclaimer + responsible-gambling warning in the requested language. Unmissable. */}
      <section
        aria-label={t('disclaimerEyebrow')}
        className="rounded-lg border-2 border-risk-med/50 bg-risk-med/10 p-5"
      >
        <div className="flex items-start gap-3">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-risk-med"
          />
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-eyebrow uppercase tracking-[0.18em] text-risk-med">
                {t('disclaimerEyebrow')}
              </span>
              <span className="rounded-full border border-risk-med/40 px-2 py-0.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-risk-med">
                {t('provenanceLabel')}: {t('provenanceValue')}
              </span>
            </div>
            <p className="text-sm font-medium text-fg">{response.disclaimer}</p>
            <div className="border-t border-risk-med/30 pt-3">
              <p className="font-mono text-eyebrow uppercase tracking-[0.16em] text-muted">
                {t('rgWarningLabel')}
              </p>
              <p className="mt-1 text-sm text-muted">
                {report.responsibleGamblingWarning}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Resolved fixture — what the free text was understood to mean (AI-estimated). */}
      <Card eyebrow={t('fixtureEyebrow')}>
        <div className="p-5">
          <p className="font-mono text-eyebrow uppercase tracking-[0.16em] text-muted">
            {t('queryLabel')}
          </p>
          <p className="mt-1 text-sm text-muted">“{response.query}”</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-fg">
            <span>{resolvedFixture.home.name}</span>
            <span className="px-2 text-muted">{DASH}</span>
            <span>{resolvedFixture.away.name}</span>
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <Fact label={t('competition')} value={competition} />
            <Fact label={t('kickoff')} value={kickoff} />
          </dl>
        </div>
      </Card>

      {/* AI narrative — the explainable prose. Numbers live in the report below; this is the "why". */}
      <Card eyebrow={t('reportEyebrow')}>
        <div className="space-y-5 p-5">
          <Prose label={t('summaryLabel')} body={report.summary} />
          {report.reasoning ? (
            <Prose label={t('reasoningLabel')} body={report.reasoning} />
          ) : null}
          {report.keyDataPoints.length > 0 ? (
            <BulletBlock label={t('keyDataPointsLabel')} items={report.keyDataPoints} />
          ) : null}
          {report.risks.length > 0 ? (
            <BulletBlock label={t('risksLabel')} items={report.risks} />
          ) : null}
        </div>
      </Card>

      {/* Calibrated numbers — reuse the existing report: risk meter + variance reminder, the
          objective market table, and the best bet / alternatives (or the honest no-value state). */}
      <PredictionReport match={resolvedFixture} result={prediction} />

      {/* SOURCES — prominent, clickable, audit-able. This is the promise that the estimates can be
          checked rather than trusted blindly. */}
      <section aria-label={t('sourcesEyebrow')}>
        <Card eyebrow={t('sourcesEyebrow')}>
          <div className="p-5">
            <p className="max-w-prose text-sm text-muted">{t('sourcesNote')}</p>
            {sources.length === 0 ? (
              <p className="mt-4 text-sm text-muted">{t('sourcesEmpty')}</p>
            ) : (
              <ul className="mt-4 divide-y divide-line/60">
                {sources.map((source, index) => (
                  <li
                    key={`${source.provider}-${index}`}
                    className="flex items-start justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-signal underline-offset-4 hover:underline"
                        >
                          <span className="truncate">{source.label}</span>
                          <ExternalLink
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0"
                          />
                          <span className="sr-only">{t('openSource')}</span>
                        </a>
                      ) : (
                        <span className="text-sm text-fg">{source.label}</span>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-eyebrow uppercase tracking-[0.14em] text-muted">
                      {source.provider}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </section>
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

function Prose({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="font-mono text-eyebrow uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-fg/90">{body}</p>
    </div>
  );
}

function BulletBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="font-mono text-eyebrow uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <ul className="mt-1.5 max-w-prose list-disc space-y-1 pl-5 text-sm leading-relaxed text-fg/90 marker:text-muted">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
