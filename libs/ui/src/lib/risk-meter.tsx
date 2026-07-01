// libs/ui/src/lib/risk-meter.tsx
// Read-only companion to RiskSlider: shows the risk appetite a report was ACTUALLY analyzed at,
// as a calibrated 0..max reading with a mono readout and the resolved bucket. Same sober language
// as the dial — a single signal hue, no celebration. Exposed as an accessible role="meter".
// All copy (label, bucket, valuetext) is passed in localized.
import type { ReactNode } from 'react';
import { cn } from './cn';
import { riskBucketOf } from './risk-bucket';

export interface RiskMeterProps {
  /** The analyzed risk appetite (0..max). */
  value: number;
  max?: number;
  /** Mono eyebrow label (localized). */
  label: ReactNode;
  /** Localized bucket name for `value`. */
  bucketLabel: ReactNode;
  /** Accessible name for the meter (localized). */
  ariaLabel: string;
  /** Accessible + human-readable value text (localized), e.g. "45 of 100, Balanced". */
  valueText: string;
  className?: string;
}

export function RiskMeter({
  value,
  max = 100,
  label,
  bucketLabel,
  ariaLabel,
  valueText,
  className,
}: RiskMeterProps) {
  const clamped = Math.min(max, Math.max(0, Math.round(value)));
  const percent = (clamped / max) * 100;
  const bucket = riskBucketOf(clamped);

  return (
    <div className={cn('flex flex-col gap-2', className)} data-bucket={bucket}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-eyebrow uppercase tracking-[0.16em] text-muted">
          {label}
        </span>
        <span className="font-mono text-sm tabular-nums text-fg">
          {clamped}
          <span className="text-muted"> / {max}</span>
        </span>
      </div>

      <div
        role="meter"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={valueText}
        className="relative h-2 w-full overflow-hidden rounded-full bg-fg/10"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-signal/70"
          style={{ width: `${percent}%` }}
        />
      </div>

      <span className="font-mono text-eyebrow uppercase tracking-[0.16em] text-signal">
        {bucketLabel}
      </span>
    </div>
  );
}
