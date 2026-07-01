// libs/ui/src/lib/confidence-bar.tsx
// SIGNATURE COMPONENT — the "calibration strip". Confidence is shown as a reading on a
// 0–100% instrument scale with fine tick marks and a monospace readout: a calibrated
// measurement, NOT a hype gauge. No colour crescendo toward "win"; a single restrained
// signal hue fills the measured portion. All copy (label) is passed in localized.
import type { ReactNode } from 'react';
import { cn } from './cn';

export interface ConfidenceBarProps {
  /** Measured confidence as a percentage 0–100. Clamped defensively. */
  value: number;
  /** Localized label copy for the measurement, e.g. t('confidence.label'). */
  label: ReactNode;
  /**
   * Formats the numeric readout (locale-aware in the app). Defaults to an integer percent.
   * Kept out of the component so number/locale formatting stays with the caller.
   */
  format?: (value: number) => string;
  /** Accessible name for the meter (localized), read by assistive tech. */
  ariaLabel: string;
  className?: string;
}

const TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export function ConfidenceBar({
  value,
  label,
  format = (v) => `${Math.round(v)}%`,
  ariaLabel,
  className,
}: ConfidenceBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const readout = format(clamped);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-eyebrow uppercase tracking-[0.16em] text-muted">
          {label}
        </span>
        <span className="font-mono text-sm tabular-nums text-fg">{readout}</span>
      </div>

      <div
        role="meter"
        aria-label={ariaLabel}
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={readout}
        className="relative h-2 w-full overflow-hidden rounded-full bg-fg/10"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-signal/80"
          style={{ width: `${clamped}%` }}
        />
      </div>

      {/* Tick scale — the instrument face. Decorative, hidden from assistive tech. */}
      <div aria-hidden="true" className="flex justify-between">
        {TICKS.map((t) => (
          <span
            key={t}
            className={cn(
              'w-px',
              t % 50 === 0 ? 'h-1.5 bg-muted/70' : 'h-1 bg-muted/30',
            )}
          />
        ))}
      </div>
    </div>
  );
}
