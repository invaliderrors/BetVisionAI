import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { PublicHeader } from '../../../components/public-header';
import { RgFooter } from '../../../components/rg-footer';

export default async function ResponsiblePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ResponsibleContent />;
}

function ResponsibleContent() {
  const t = useTranslations('footer');
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:px-6">
        <span className="rounded border border-line px-1.5 py-0.5 font-mono text-eyebrow tracking-[0.14em] text-muted">
          {t('age')}
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-fg">
          {t('rgTitle')}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-fg/90">{t('rgBody')}</p>
        <p className="mt-3 text-sm text-muted">{t('reminder')}</p>
        <p className="mt-8 border-t border-line pt-6 text-xs text-muted">
          {t('disclaimer')}
        </p>
      </main>
      <RgFooter />
    </div>
  );
}
