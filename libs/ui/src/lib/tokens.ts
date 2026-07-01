// libs/ui/src/lib/tokens.ts
// Canonical design tokens for BetVision AI — the single source of truth for the
// "calibrated instrument" visual language. The consuming app (apps/web) mirrors these
// values into its Tailwind v4 `@theme` block; keep the two in sync.
//
// Design intent (SPEC §8): a deliberately SOBER, non-celebratory system. Risk is never
// dressed as reward — "low risk" is a calm steel-blue, NOT green, so the UI can never
// imply "green = guaranteed win". Confidence reads as a calibrated measurement, not a hype gauge.

/** Brand + surface colors. Dark-first ("ink" canvas); light values provided for parity. */
export const colors = {
  /** Deep desaturated blue-black canvas (dark mode). */
  ink: '#0C1119',
  /** Raised surface / card background (dark mode). */
  surface: '#111925',
  /** Cool near-white canvas (light mode). */
  mist: '#F4F6F9',
  /** Restrained instrument-blue accent. Used sparingly — never as celebration. */
  signal: '#4C9DE0',
  /** Foreground text on the ink canvas. */
  fgDark: '#E7ECF3',
  /** Foreground text on the mist canvas. */
  fgLight: '#0C1119',
} as const;

/**
 * Risk triad — deliberately NON-celebratory. No green anywhere: a calm signal must not
 * be misread as a guaranteed win. Low = steel-blue, Med = brass, High = desaturated brick.
 */
export const risk = {
  low: '#6E8BA3',
  medium: '#C79A3E',
  high: '#B05A4E',
} as const;

/** Key into the risk color scale. The public risk union lives on `RiskBadge` (RiskLevel). */
export type RiskColorKey = keyof typeof risk;

/** Modular type scale (rem). Tight, editorial. */
export const fontSize = {
  eyebrow: '0.6875rem', // 11px — mono, wide-tracked micro-labels
  xs: '0.75rem',
  sm: '0.8125rem',
  base: '0.9375rem',
  lg: '1.0625rem',
  xl: '1.375rem',
  '2xl': '1.875rem',
  '3xl': '2.625rem',
} as const;

/** Font stacks. A grotesque body paired with monospace as a co-lead for data + labels. */
export const fontFamily = {
  sans: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
} as const;

/** 4px-based spacing scale (rem). */
export const space = {
  '0': '0',
  '1': '0.25rem',
  '2': '0.5rem',
  '3': '0.75rem',
  '4': '1rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '8': '2rem',
  '10': '2.5rem',
  '12': '3rem',
  '16': '4rem',
} as const;

/** Corner radii — restrained; the instrument aesthetic favours crisp edges. */
export const radius = {
  none: '0',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  pill: '9999px',
} as const;

export const tokens = { colors, risk, fontSize, fontFamily, space, radius } as const;
export type Tokens = typeof tokens;
