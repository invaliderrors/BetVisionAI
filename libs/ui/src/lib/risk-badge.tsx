// libs/ui/src/lib/risk-badge.tsx
// Sober risk indicator. The colour system is deliberately NON-celebratory: low risk is a
// calm steel-blue (never green), so a badge can never read as "guaranteed win". The visible
// label is passed in already localized — the component embeds no copy.
import type { ReactNode } from 'react';
import { cn } from './cn';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskBadgeProps {
  level: RiskLevel;
  /** Localized label copy, e.g. t('risk.low'). */
  label: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

const levelStyles: Record<RiskLevel, string> = {
  // No green anywhere — see design note above.
  low: 'text-risk-low border-risk-low/40 bg-risk-low/10',
  medium: 'text-risk-med border-risk-med/40 bg-risk-med/10',
  high: 'text-risk-high border-risk-high/40 bg-risk-high/10',
};

const sizeStyles = {
  sm: 'text-eyebrow px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
} as const;

export function RiskBadge({
  level,
  label,
  size = 'md',
  className,
}: RiskBadgeProps) {
  return (
    <span
      data-level={level}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-[0.14em]',
        levelStyles[level],
        sizeStyles[size],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-current opacity-80"
      />
      {label}
    </span>
  );
}
