'use client';
// apps/web/src/components/register-form.tsx
// Registration form with the mandatory AGE GATE + Terms acceptance (both required literal-true,
// mirroring the backend compliance gate) and a locale selector. Validates with a zod schema
// (i18n-keyed messages) and registers via the auth store, which then establishes the session.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import type { RegisterRequest } from '@betvision/contracts';
import { Button, Input } from '@betvision/ui';
import { Link, useRouter } from '../i18n/navigation';
import { routing } from '../i18n/routing';
import { useAuthStore } from '../lib/auth/auth-store';
import {
  registerFormSchema,
  type RegisterFormValues,
} from '../lib/auth/auth-schemas';

export function RegisterForm() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const registerUser = useAuthStore((s) => s.register);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: '',
      password: '',
      locale: locale === 'es' ? 'es' : 'en',
      ageConfirmed: false as unknown as true,
      acceptedTerms: false as unknown as true,
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setSubmitError(null);
    try {
      await registerUser(values as RegisterRequest, values.locale);
      router.replace('/dashboard');
    } catch {
      setSubmitError(t('register.error'));
    }
  }

  const checkboxClass =
    'mt-0.5 h-4 w-4 shrink-0 rounded border-line bg-bg/40 text-signal ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60';

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {submitError ? (
        <p
          role="alert"
          className="rounded-md border border-risk-high/40 bg-risk-high/10 px-3 py-2 text-sm text-risk-high"
        >
          {submitError}
        </p>
      ) : null}

      <Input
        label={t('register.email')}
        type="email"
        autoComplete="email"
        error={errors.email ? t(errors.email.message ?? '') : undefined}
        {...register('email')}
      />
      <Input
        label={t('register.password')}
        type="password"
        autoComplete="new-password"
        hint={t('register.passwordHint')}
        error={errors.password ? t(errors.password.message ?? '') : undefined}
        {...register('password')}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="register-locale"
          className="font-mono text-eyebrow uppercase tracking-[0.16em] text-muted"
        >
          {t('register.locale')}
        </label>
        <select
          id="register-locale"
          className="h-10 rounded-md border border-line bg-bg/40 px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60"
          {...register('locale')}
        >
          {routing.locales.map((l) => (
            <option key={l} value={l}>
              {t(`localeName.${l}`)}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-3 border-t border-line pt-4">
        <label className="flex items-start gap-3 text-sm text-fg">
          <input
            type="checkbox"
            className={checkboxClass}
            aria-describedby={errors.ageConfirmed ? 'age-error' : undefined}
            {...register('ageConfirmed')}
          />
          <span>{t('register.age')}</span>
        </label>
        {errors.ageConfirmed ? (
          <p id="age-error" role="alert" className="text-xs text-risk-high">
            {t(errors.ageConfirmed.message ?? '')}
          </p>
        ) : null}

        <label className="flex items-start gap-3 text-sm text-fg">
          <input
            type="checkbox"
            className={checkboxClass}
            aria-describedby={errors.acceptedTerms ? 'terms-error' : undefined}
            {...register('acceptedTerms')}
          />
          <span>{t('register.terms')}</span>
        </label>
        {errors.acceptedTerms ? (
          <p id="terms-error" role="alert" className="text-xs text-risk-high">
            {t(errors.acceptedTerms.message ?? '')}
          </p>
        ) : null}
      </fieldset>

      <Button type="submit" size="lg" loading={isSubmitting} className="mt-1 w-full">
        {t('register.submit')}
      </Button>

      <p className="text-center text-sm text-muted">
        {t('register.haveAccount')}{' '}
        <Link
          href="/login"
          className="text-signal underline-offset-4 hover:underline"
        >
          {t('register.signIn')}
        </Link>
      </p>
    </form>
  );
}
