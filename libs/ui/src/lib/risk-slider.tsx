'use client';
// libs/ui/src/lib/risk-slider.tsx
// SIGNATURE COMPONENT — the "risk dial". The user sets how much variance they will accept on a
// 0..100 calibrated bar (Feature Spec B). It is deliberately an instrument, NOT a hype gauge:
// a single restrained signal hue fills the measured portion, and fine ticks mark the bucket
// boundaries (Conservative 0–33 / Balanced 34–66 / Aggressive 67–100). Risk shapes SELECTION,
// never the underlying probabilities — so the dial never colours "aggressive" as reward.
//
// Fully accessible: role="slider" with aria-valuemin/max/now/valuetext and complete keyboard
// support (arrows, Home/End, PageUp/PageDown). ALL copy (label, bucket names, descriptions,
// valuetext) arrives via props — the component embeds no text, so the app owns i18n.
//
// Interactive (uses client-only hooks) so it carries the 'use client' directive; the pure bucket
// helpers live in ./risk-bucket so server components can use them without this boundary.
import {
  useCallback,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { cn } from './cn';
import { RISK_BUCKET_BOUNDS, riskBucketOf, type RiskBucket } from './risk-bucket';

export interface RiskSliderBucketCopy {
  /** Localized bucket name, e.g. "Balanced". */
  label: string;
  /** One-line, plain-language description of what this appetite changes. */
  description: string;
}

export interface RiskSliderProps {
  /** Current value (0..100). Controlled. */
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Step size for PageUp / PageDown (default 10). */
  largeStep?: number;
  /** Visible control label (localized), rendered as a mono eyebrow. */
  label: ReactNode;
  /** Accessible name for the slider (localized), read by assistive tech. */
  ariaLabel: string;
  /** Copy for every bucket; the component selects the active one from `value`. */
  buckets: Record<RiskBucket, RiskSliderBucketCopy>;
  /**
   * Builds aria-valuetext (locale/number formatting stays with the caller).
   * Defaults to `"{value} / {max} · {bucketLabel}"`.
   */
  formatValueText?: (value: number, bucketLabel: string, max: number) => string;
  disabled?: boolean;
  className?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function RiskSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  largeStep = 10,
  label,
  ariaLabel,
  buckets,
  formatValueText,
  disabled = false,
  className,
}: RiskSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const current = clamp(Math.round(value), min, max);
  const bucket = riskBucketOf(current);
  const bucketCopy = buckets[bucket];
  const percent = ((current - min) / (max - min)) * 100;
  const valueText =
    formatValueText?.(current, bucketCopy.label, max) ??
    `${current} / ${max} · ${bucketCopy.label}`;

  const commit = useCallback(
    (next: number) => {
      if (disabled) return;
      const clamped = clamp(Math.round(next), min, max);
      if (clamped !== current) onChange(clamped);
    },
    [current, disabled, max, min, onChange],
  );

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = current + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = current - step;
        break;
      case 'PageUp':
        next = current + largeStep;
        break;
      case 'PageDown':
        next = current - largeStep;
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    commit(next);
  }

  function valueFromClientX(clientX: number): number {
    const el = trackRef.current;
    if (!el) return current;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return current;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return min + ratio * (max - min);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    commit(valueFromClientX(event.clientX));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    // Only track while the primary button is held (buttons bit 1).
    if (disabled || (event.buttons & 1) === 0) return;
    commit(valueFromClientX(event.clientX));
  }

  const boundaryPercents = [
    ((RISK_BUCKET_BOUNDS.conservative - min) / (max - min)) * 100,
    ((RISK_BUCKET_BOUNDS.balanced - min) / (max - min)) * 100,
  ];

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-eyebrow uppercase tracking-[0.16em] text-muted">
          {label}
        </span>
        <span
          data-testid="risk-readout"
          className="font-mono text-sm tabular-nums text-fg"
        >
          {current}
          <span className="text-muted"> / {max}</span>
        </span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        aria-valuetext={valueText}
        aria-disabled={disabled || undefined}
        data-bucket={bucket}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className={cn(
          'relative flex h-8 w-full touch-none select-none items-center rounded-full outline-none',
          'focus-visible:ring-2 focus-visible:ring-signal/60',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        )}
      >
        {/* Track + measured fill. */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-fg/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-signal/70"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Bucket-boundary ticks — the calibration marks that make this a dial, not a gauge. */}
        {boundaryPercents.map((p, index) => (
          <span
            key={index}
            aria-hidden="true"
            className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-muted/50"
            style={{ left: `${p}%` }}
          />
        ))}

        {/* Thumb — a square instrument pointer, never a celebratory knob. */}
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-signal bg-surface"
          style={{ left: `${percent}%` }}
        />
      </div>

      <div>
        <span
          data-testid="risk-bucket"
          className="font-mono text-eyebrow uppercase tracking-[0.16em] text-signal"
        >
          {bucketCopy.label}
        </span>
        <p className="mt-1 text-sm text-muted">{bucketCopy.description}</p>
      </div>
    </div>
  );
}
