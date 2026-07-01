'use client';
// apps/web/src/components/providers.tsx
// Client-side provider stack: i18n messages, server-state (React Query), and the silent
// session bootstrap. Rendered once from the locale layout with server-loaded messages.
import { useState, type ReactNode } from 'react';
import { NextIntlClientProvider, type Messages } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthBootstrap } from './auth-bootstrap';

interface ProvidersProps {
  locale: string;
  messages: Messages;
  timeZone: string;
  children: ReactNode;
}

export function Providers({
  locale,
  messages,
  timeZone,
  children,
}: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={timeZone}
    >
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap locale={locale} />
        {children}
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}
