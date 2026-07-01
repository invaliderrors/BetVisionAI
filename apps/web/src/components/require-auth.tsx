'use client';
// apps/web/src/components/require-auth.tsx
// Client-side route guard. The access token lives in memory (not a readable cookie), so
// protection happens here rather than in middleware: unauthenticated users are redirected to
// the login screen; while the silent refresh resolves, a calm "checking session" splash shows.
import { useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '../i18n/navigation';
import { useAuthStore } from '../lib/auth/auth-store';

export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const router = useRouter();
  const t = useTranslations('guard');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-3"
      >
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-transparent"
        />
        <span className="font-mono text-eyebrow uppercase tracking-[0.16em] text-muted">
          {t('checking')}
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
