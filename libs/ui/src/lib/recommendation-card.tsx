// libs/ui/src/lib/recommendation-card.tsx
// A single value-bet recommendation, presented soberly. The card surfaces the market/selection,
// a small grid of instrument metrics (edge, EV, stake…), and slots for a confidence readout and a
// RiskBadge. The "best bet" variant is marked with a restrained signal outline + badge — never a
// celebratory colour. ALL copy (title, selection, metric labels, rationale) is passed in localized.
import type { ReactNode } from 'react';
import { cn } from './cn';

export interface RecommendationMetric {
  /** Stable key for the metric cell. */
  key: string;
  /** Mono micro-label (localized). */
  label: ReactNode;
  /** The value (rendered in tabular mono figures). */
  value: ReactNode;
}

export interface RecommendationCardProps {
  /** Primary line, e.g. the localized market name. */
  title: ReactNode;
  /** Secondary line, e.g. the selection. */
  selection: ReactNode;
  /** Marks the card as the top pick: renders the badge + a signal outline. */
  isBestBet?: boolean;
  /** Localized "best bet" badge copy (only shown when `isBestBet`). */
  bestBetLabel?: ReactNode;
  metrics: RecommendationMetric[];
  /** Slot for a confidence indicator/label (already localized). */
  confidenceSlot?: ReactNode;
  /** Slot for a RiskBadge (already localized). */
  riskSlot?: ReactNode;
  /** Plain-language rationale (localized by the caller). */
  rationale?: ReactNode;
  className?: string;
}

export function RecommendationCard({
  title,
  selection,
  isBestBet = false,
  bestBetLabel,
  metrics,
  confidenceSlot,
  riskSlot,
  rationale,
  className,
}: RecommendationCardProps) {
  return (
    <article
      data-best-bet={isBestBet || undefined}
      className={cn(
        'rounded-lg border bg-surface/60 p-5',
        isBestBet ? 'border-signal/50' : 'border-line',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium tracking-tight text-fg">{title}</h3>
          <p className="mt-0.5 text-sm text-muted">{selection}</p>
        </div>
        {isBestBet && bestBetLabel ? (
          <span className="shrink-0 rounded-full border border-signal/50 bg-signal/10 px-2.5 py-1 font-mono text-eyebrow uppercase tracking-[0.14em] text-signal">
            {bestBetLabel}
          </span>
        ) : null}
      </div>

      {metrics.length > 0 ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.key}>
              <dt className="font-mono text-eyebrow uppercase tracking-[0.14em] text-muted">
                {metric.label}
              </dt>
              <dd className="mt-1 font-mono text-sm tabular-nums text-fg">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {confidenceSlot || riskSlot ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {confidenceSlot}
          {riskSlot}
        </div>
      ) : null}

      {rationale ? (
        <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
          {rationale}
        </p>
      ) : null}
    </article>
  );
}
