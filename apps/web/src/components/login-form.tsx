'use client';
// apps/web/src/components/login-form.tsx
// Login screen form. Validates with a zod schema (i18n-keyed messages), submits via the auth
// store, and surfaces a single generic error on failure (no account enumeration). All copy is
// localized; field errors render the translated key produced by the resolver.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import type { LoginRequest } from '@betvision/contracts';
import { Button, Input } from '@betvision/ui';
import { Link, useRouter } from '../i18n/navigation';
import { useAuthStore } from '../lib/auth/auth-store';
import { loginFormSchema, type LoginFormValues } from '../lib/auth/auth-schemas';

export function LoginForm() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);
    try {
      await login(values as LoginRequest, locale);
      router.replace('/dashboard');
    } catch {
      setSubmitError(t('login.error'));
    }
  }

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
        label={t('login.email')}
        type="email"
        autoComplete="email"
        error={errors.email ? t(errors.email.message ?? '') : undefined}
        {...register('email')}
      />
      <Input
        label={t('login.password')}
        type="password"
        autoComplete="current-password"
        error={errors.password ? t(errors.password.message ?? '') : undefined}
        {...register('password')}
      />

      <Button type="submit" size="lg" loading={isSubmitting} className="mt-1 w-full">
        {t('login.submit')}
      </Button>

      <p className="text-center text-sm text-muted">
        {t('login.noAccount')}{' '}
        <Link
          href="/register"
          className="text-signal underline-offset-4 hover:underline"
        >
          {t('login.createOne')}
        </Link>
      </p>
    </form>
  );
}
