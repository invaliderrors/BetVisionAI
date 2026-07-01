// apps/web/src/lib/format.ts
// Locale-aware formatting helpers (dates, numbers, percentages, decimal odds). Kickoffs and
// timestamps are stored/transferred as UTC ISO strings and formatted in the active locale at
// the edge. Locale is a BCP-47 string (what next-intl's useLocale returns); the Intl APIs
// validate it. Keeping these here (rather than inline) means every screen formats consistently.

const DATE_STYLE: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/** Format a UTC ISO timestamp for display in the given locale. */
export function formatDateTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, DATE_STYLE).format(date);
}

/** Format a plain number (e.g. counts) in the given locale. */
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/** Format a probability 0..1 as a locale-aware percentage. */
export function formatPercent(
  probability: number,
  locale: string,
  fractionDigits = 0,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(probability);
}

/** Format decimal odds (the default display format) with two fraction digits. */
export function formatDecimalOdds(odds: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(odds);
}
