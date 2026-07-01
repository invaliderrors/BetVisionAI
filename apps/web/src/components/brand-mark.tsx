// apps/web/src/components/brand-mark.tsx
// Wordmark + instrument glyph. The glyph is a minimal calibration tick — the product's motif.
import { useTranslations } from 'next-intl';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('common');
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5 text-signal"
        fill="none"
      >
        <path d="M2 17h20" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 17V11M12 17V5M18 17V13" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {!compact ? (
        <span className="font-mono text-sm font-medium tracking-tight text-fg">
          {t('brand')}
        </span>
      ) : null}
    </span>
  );
}
