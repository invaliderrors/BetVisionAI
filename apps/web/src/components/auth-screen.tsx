// apps/web/src/components/auth-screen.tsx
// Shared shell for the login + register screens: public header, a centered titled panel, and
// the responsible-gambling footer. The heading copy is namespaced (login | register).
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PublicHeader } from './public-header';
import { RgFooter } from './rg-footer';

export function AuthScreen({
  namespace,
  children,
}: {
  namespace: 'login' | 'register';
  children: ReactNode;
}) {
  const t = useTranslations(namespace);
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-14 sm:px-6">
        <div className="w-full max-w-md">
          <p className="font-mono text-eyebrow uppercase tracking-[0.22em] text-signal">
            {t('eyebrow')}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-fg">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-muted">{t('subtitle')}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
      <RgFooter />
    </div>
  );
}
