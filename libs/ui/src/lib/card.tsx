// libs/ui/src/lib/card.tsx
// Surface container + compositional parts. Copy is always passed in by the caller.
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional mono micro-label rendered as an eyebrow above the card body. */
  eyebrow?: ReactNode;
}

export function Card({ eyebrow, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface/60 backdrop-blur-sm',
        className,
      )}
      {...rest}
    >
      {eyebrow ? (
        <div className="border-b border-line px-5 pt-4 pb-3">
          <span className="font-mono text-eyebrow uppercase tracking-[0.18em] text-muted">
            {eyebrow}
          </span>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function CardBody({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...rest}>
      {children}
    </div>
  );
}

export interface StatCardProps {
  /** Mono eyebrow describing the metric. */
  label: ReactNode;
  /** The primary value (rendered in tabular mono figures). */
  value: ReactNode;
  /** Optional secondary caption below the value. */
  caption?: ReactNode;
  className?: string;
}

/** Compact metric tile used across the dashboard. Numbers use tabular figures. */
export function StatCard({ label, value, caption, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface/60 p-5',
        className,
      )}
    >
      <span className="font-mono text-eyebrow uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      <div className="mt-3 font-mono text-2xl tabular-nums text-fg">{value}</div>
      {caption ? (
        <div className="mt-1 text-xs text-muted">{caption}</div>
      ) : null}
    </div>
  );
}
