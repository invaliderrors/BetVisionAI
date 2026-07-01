import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Button, Card, ConfidenceBar } from '@betvision/ui';
import { Link } from '../../i18n/navigation';
import { PublicHeader } from '../../components/public-header';
import { RgFooter } from '../../components/rg-footer';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Landing />;
}

function Landing() {
  const t = useTranslations('landing');
  const tc = useTranslations('common');
  const tConf = useTranslations('confidence');

  const props = ['model', 'risk', 'sources'] as const;

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero — the thesis: a calibrated reading, stated plainly, beside a live instrument. */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="instrument-grid pointer-events-none absolute inset-0 opacity-60"
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="font-mono text-eyebrow uppercase tracking-[0.22em] text-signal">
                {t('eyebrow')}
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-[1.05] tracking-tight text-fg sm:text-[2.75rem]">
                {t('title')}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
                {t('lead')}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/register">
                  <Button
                    size="lg"
                    leadingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
                  >
                    {t('ctaCreate')}
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="secondary">
                    {t('ctaSignIn')}
                  </Button>
                </Link>
              </div>
              <p className="mt-6 max-w-md text-xs text-muted">{t('note')}</p>
            </div>

            <Card className="bg-surface/70 p-6">
              <ConfidenceBar
                value={58}
                label={t('instrument.label')}
                ariaLabel={tConf('aria')}
              />
              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5">
                {['0.14', '2.05', '58%'].map((v, i) => (
                  <div key={i}>
                    <div className="font-mono text-lg tabular-nums text-fg">{v}</div>
                    <div className="mt-0.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-muted">
                      {['edge', 'odds', 'conf'][i]}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs text-muted">{t('instrument.caption')}</p>
            </Card>
          </div>
        </section>

        {/* Value props — three claims that all reduce to "measured, not promised". */}
        <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <div className="grid gap-5 md:grid-cols-3">
            {props.map((key) => (
              <Card key={key} className="p-6">
                <h2 className="text-base font-medium tracking-tight text-fg">
                  {t(`props.${key}.title`)}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {t(`props.${key}.body`)}
                </p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <RgFooter />
      <span className="sr-only">{tc('brand')}</span>
    </div>
  );
}
