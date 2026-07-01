// apps/web/src/components/rg-footer.tsx
// Persistent responsible-gambling footer (SPEC §8). Always present on core screens: it states
// that predictions are probabilistic, carries the non-guarantee disclaimer, and links to limits.
import { useTranslations } from 'next-intl';
import { Link } from '../i18n/navigation';

export function RgFooter() {
  const t = useTranslations('footer');
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <span className="rounded border border-line px-1.5 py-0.5 font-mono text-eyebrow tracking-[0.14em] text-muted">
                {t('age')}
              </span>
              <h2 className="font-mono text-eyebrow uppercase tracking-[0.18em] text-muted">
                {t('rgTitle')}
              </h2>
            </div>
            <p className="mt-3 text-sm text-fg/90">{t('rgBody')}</p>
            <p className="mt-2 text-xs text-muted">{t('reminder')}</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              href="/responsible"
              className="text-sm text-signal underline-offset-4 hover:underline"
            >
              {t('rgLink')}
            </Link>
            <p className="text-xs text-muted">{t('disclaimer')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
