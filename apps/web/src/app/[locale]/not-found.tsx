import { useTranslations } from 'next-intl';
import { Link } from '../../i18n/navigation';

export default function NotFound() {
  const t = useTranslations('errors');
  const tc = useTranslations('common');
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="font-mono text-2xl tabular-nums text-muted">404</span>
      <p className="text-sm text-muted">{t('not_found')}</p>
      <Link href="/" className="text-sm text-signal underline-offset-4 hover:underline">
        {tc('brand')}
      </Link>
    </div>
  );
}
