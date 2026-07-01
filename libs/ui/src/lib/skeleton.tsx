// libs/ui/src/lib/skeleton.tsx
// Loading placeholder. Announces a busy state to assistive tech via role="status".
import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Screen-reader-only busy label, passed in by the caller (localized). */
  srLabel?: string;
}

export function Skeleton({ className, srLabel, ...rest }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('animate-pulse rounded-md bg-fg/10', className)}
      {...rest}
    >
      {srLabel ? <span className="sr-only">{srLabel}</span> : null}
    </div>
  );
}
