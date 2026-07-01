'use client';
// apps/web/src/components/analyze-view.tsx
// "Analyze any fixture" — the free-text entry point (Feature Spec B). The user types a fixture
// ("Portugal vs Spain"), sets a risk appetite (default 33), optionally picks the report language
// (defaults to the current locale), and runs a calibrated analysis. POST /analyze is SLOW when the
// server runs live research (web search + LLM, ~2–4 min), so the submit state is a long-running,
// honest "research console": an indeterminate progress bar, rotating step captions, a plain note
// that this can take a couple of minutes, and a Cancel control. Errors are recoverable (Retry).
// Re-running after moving the slider re-calls POST /analyze with the new riskAppetite.
//
// TODO(async job + SSE): once the backend moves this behind a BullMQ job, switch to a `jobId` +
// SSE/poll stepper so a dropped tab no longer loses a multi-minute run (see lib/api/analyze.ts).
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Button, Card, Input, LanguageSwitcher } from '@betvision/ui';
import { analyzeApi } from '../lib/api';
import { errorSubKey } from '../lib/api/error-message';
import { routing, type AppLocale } from '../i18n/routing';
import { RiskAppetiteSlider } from './risk-appetite-slider';
import { AnalyzeReport } from './analyze-report';

const DEFAULT_RISK_APPETITE = 33;
const PROGRESS_STEPS = ['resolve', 'research', 'model', 'value'] as const;
const STEP_ROTATE_MS = 3500;

// Message is a KEY relative to the `analyze` translation scope (rendered via t(...) below).
const analyzeFormSchema = z.object({
  query: z.string().trim().min(1, { message: 'form.errors.queryRequired' }),
});
type AnalyzeFormValues = z.infer<typeof analyzeFormSchema>;

interface AnalyzeVariables {
  query: string;
  riskAppetite: number;
  language: AppLocale;
}

export interface AnalyzeViewProps {
  /** Optional prefill (e.g. from the dashboard hero's `?q=`). */
  initialQuery?: string;
}

export function AnalyzeView({ initialQuery = '' }: AnalyzeViewProps) {
  const locale = useLocale();
  const t = useTranslations('analyze');
  const tLocaleName = useTranslations('localeName');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const [riskAppetite, setRiskAppetite] = useState(DEFAULT_RISK_APPETITE);
  const [language, setLanguage] = useState<AppLocale>(locale as AppLocale);

  const controllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AnalyzeFormValues>({
    resolver: zodResolver(analyzeFormSchema),
    defaultValues: { query: initialQuery },
  });

  // Prefill from the dashboard hero's `?q=` on mount (client-only, so the page stays static). An
  // explicit `initialQuery` prop (e.g. in tests) always wins over the URL.
  useEffect(() => {
    if (initialQuery) return;
    const q = new URLSearchParams(window.location.search).get('q')?.trim();
    if (q) setValue('query', q);
  }, [initialQuery, setValue]);

  const analyze = useMutation({
    mutationFn: (vars: AnalyzeVariables) => {
      const controller = new AbortController();
      controllerRef.current = controller;
      return analyzeApi.analyzeFixture(
        {
          query: vars.query,
          riskAppetite: vars.riskAppetite,
          language: vars.language,
        },
        locale,
        { signal: controller.signal },
      );
    },
  });

  function onSubmit(values: AnalyzeFormValues) {
    cancelledRef.current = false;
    analyze.mutate({ query: values.query, riskAppetite, language });
  }

  function handleCancel() {
    cancelledRef.current = true;
    controllerRef.current?.abort();
    analyze.reset();
  }

  const languageOptions = routing.locales.map((l) => ({
    value: l,
    label: tLocaleName(l),
  }));

  const isPending = analyze.isPending;
  // A deliberately cancelled run rejects as a network abort — never surface that as an error.
  const showError = analyze.isError && !cancelledRef.current;
  const hasResult = analyze.isSuccess && analyze.data && !isPending;

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-eyebrow uppercase tracking-[0.2em] text-signal">
          {t('page.eyebrow')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg">
          {t('page.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('page.subtitle')}</p>
      </header>

      {/* Query + risk + language + Analyze. The form owns the non-empty query validation. */}
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 p-5">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-[2.15rem] h-4 w-4 text-muted"
            />
            <Input
              label={t('form.queryLabel')}
              type="text"
              autoComplete="off"
              placeholder={t('form.placeholder')}
              className="pl-9"
              disabled={isPending}
              error={
                errors.query ? t(errors.query.message ?? '') : undefined
              }
              hint={errors.query ? undefined : t('form.hint')}
              {...register('query')}
            />
          </div>

          <div className="grid gap-6 border-t border-line pt-5 sm:grid-cols-[1fr_auto] sm:items-start">
            <RiskAppetiteSlider
              value={riskAppetite}
              onChange={setRiskAppetite}
              disabled={isPending}
            />
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-eyebrow uppercase tracking-[0.16em] text-muted">
                {t('form.languageLabel')}
              </span>
              <LanguageSwitcher
                options={languageOptions}
                value={language}
                onChange={(next) => setLanguage(next as AppLocale)}
                ariaLabel={t('form.languageLabel')}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <Button type="submit" size="lg" loading={isPending}>
              {hasResult ? t('form.reanalyze') : t('form.submit')}
            </Button>
            {isPending ? (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={handleCancel}
                leadingIcon={<X aria-hidden="true" className="h-4 w-4" />}
              >
                {t('progress.cancel')}
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      {/* Long-running research state. Indeterminate — the real server has no % to report today. */}
      {isPending ? <ResearchProgress /> : null}

      {/* Recoverable error (timeout / network / auth). */}
      {showError ? (
        <Card>
          <div className="space-y-3 p-5">
            <p
              role="alert"
              className="rounded-md border border-risk-high/40 bg-risk-high/10 px-3 py-2 text-sm text-risk-high"
            >
              {t('error.title')} {tErrors(errorSubKey(analyze.error))}
            </p>
            <Button
              variant="secondary"
              onClick={handleSubmit(onSubmit)}
            >
              {tCommon('retry')}
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Result — fixture, disclaimer, narrative, numbers, and sources. */}
      {hasResult && analyze.data ? (
        <AnalyzeReport response={analyze.data} />
      ) : null}
    </div>
  );
}

/**
 * Honest, indeterminate research console. An `role="progressbar"` with NO aria-valuenow denotes an
 * indeterminate task; a polite live region rotates through the real phases so the wait is legible.
 * Motion is neutralized under prefers-reduced-motion by the global stylesheet.
 */
function ResearchProgress() {
  const t = useTranslations('analyze.progress');
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStepIndex((i) => (i + 1) % PROGRESS_STEPS.length);
    }, STEP_ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <Card eyebrow={t('eyebrow')}>
      <div className="space-y-5 p-5">
        <div>
          <p className="text-sm font-medium text-fg">{t('title')}</p>
          <p
            aria-live="polite"
            className="mt-1 font-mono text-sm text-signal"
            data-testid="progress-caption"
          >
            {t(`steps.${PROGRESS_STEPS[stepIndex]}`)}
          </p>
        </div>

        <div
          role="progressbar"
          aria-label={t('barLabel')}
          aria-busy="true"
          className="h-1.5 w-full overflow-hidden rounded-full bg-fg/10"
        >
          <div className="h-full w-1/3 animate-pulse rounded-full bg-signal/70" />
        </div>

        {/* The phases, laid out as a static readout; the active one is highlighted. */}
        <ol className="grid gap-2 sm:grid-cols-2">
          {PROGRESS_STEPS.map((step, index) => (
            <li
              key={step}
              aria-current={index === stepIndex ? 'step' : undefined}
              className={
                'flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-eyebrow uppercase tracking-[0.14em] ' +
                (index === stepIndex
                  ? 'border-signal/40 text-signal'
                  : 'border-line text-muted')
              }
            >
              <span
                aria-hidden="true"
                className={
                  'h-1.5 w-1.5 rounded-full ' +
                  (index === stepIndex ? 'bg-signal' : 'bg-muted/40')
                }
              />
              {t(`steps.${step}`)}
            </li>
          ))}
        </ol>

        <p className="max-w-prose text-xs text-muted">{t('note')}</p>
      </div>
    </Card>
  );
}
