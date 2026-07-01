'use client';
// apps/web/src/components/analyze-hero.tsx
// The dashboard's prominent "analyze any fixture" entry point (Feature Spec B). A free-text field
// that hands off to the dedicated /analyze page (carrying the query as `?q=`), where the risk dial,
// language toggle, long-running research UX, and full report live. Kept deliberately light: it is
// an on-ramp, not the analysis itself. All copy is i18n-keyed.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Search } from 'lucide-react';
import { Button, Input } from '@betvision/ui';
import { useRouter } from '../i18n/navigation';

export function AnalyzeHero() {
  const t = useTranslations('analyze.hero');
  const router = useRouter();
  const [query, setQuery] = useState('');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    const href = trimmed
      ? `/analyze?q=${encodeURIComponent(trimmed)}`
      : '/analyze';
    router.push(href);
  }

  return (
    <section
      aria-label={t('title')}
      className="relative overflow-hidden rounded-lg border border-line bg-surface/60"
    >
      <div
        aria-hidden="true"
        className="instrument-grid pointer-events-none absolute inset-0 opacity-50"
      />
      <div className="relative p-6 sm:p-8">
        <p className="font-mono text-eyebrow uppercase tracking-[0.2em] text-signal">
          {t('eyebrow')}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-fg sm:text-2xl">
          {t('title')}
        </h2>
        <p className="mt-1 max-w-xl text-sm text-muted">{t('subtitle')}</p>

        <form
          onSubmit={handleSubmit}
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-[2.15rem] h-4 w-4 text-muted"
            />
            <Input
              label={t('title')}
              type="text"
              autoComplete="off"
              placeholder={t('placeholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="shrink-0"
            leadingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
          >
            {t('cta')}
          </Button>
        </form>

        <p className="mt-4 max-w-xl text-xs text-muted">{t('aiNote')}</p>
      </div>
    </section>
  );
}
