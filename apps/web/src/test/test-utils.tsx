// apps/web/src/test/test-utils.tsx
// Shared render helpers that wrap components in the i18n + server-state providers used by the
// app, so tests exercise the real translation + query wiring.
import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import enMessages from '../../messages/en.json';

type Messages = typeof enMessages;

interface IntlOptions {
  locale?: string;
  messages?: Messages;
}

export function renderWithIntl(
  ui: ReactElement,
  { locale = 'en', messages = enMessages }: IntlOptions = {},
): RenderResult {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {ui}
    </NextIntlClientProvider>,
  );
}

export function renderWithProviders(
  ui: ReactElement,
  { locale = 'en', messages = enMessages }: IntlOptions = {},
): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NextIntlClientProvider>
  );
  return render(ui, { wrapper });
}

export { enMessages };
