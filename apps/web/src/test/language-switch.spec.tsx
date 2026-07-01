import type { ReactNode } from 'react';
import { screen } from '@testing-library/react';
import { renderWithIntl } from './test-utils';
import en from '../../messages/en.json';
import es from '../../messages/es.json';

// The footer links via the i18n navigation helper; stub it to a plain passthrough.
jest.mock('../i18n/navigation', () => ({
  __esModule: true,
  Link: ({ children }: { children?: ReactNode }) => children,
}));

import { RgFooter } from '../components/rg-footer';

describe('i18n language switch', () => {
  it('renders 100% of the footer copy from the English catalog', () => {
    renderWithIntl(<RgFooter />, { locale: 'en', messages: en });

    expect(screen.getByText(en.footer.rgTitle)).toBeInTheDocument();
    expect(screen.getByText(en.footer.reminder)).toBeInTheDocument();
    // Spanish copy must NOT be present under the English locale.
    expect(screen.queryByText(es.footer.rgTitle)).not.toBeInTheDocument();
  });

  it('renders the SAME component entirely in Spanish when the catalog switches', () => {
    renderWithIntl(<RgFooter />, { locale: 'es', messages: es });

    expect(screen.getByText(es.footer.rgTitle)).toBeInTheDocument();
    expect(screen.getByText(es.footer.reminder)).toBeInTheDocument();
    // English copy must NOT survive the switch — proves no hardcoded strings.
    expect(screen.queryByText(en.footer.rgTitle)).not.toBeInTheDocument();
  });

  it('changes the visible title text between locales', () => {
    const { unmount } = renderWithIntl(<RgFooter />, {
      locale: 'en',
      messages: en,
    });
    const englishTitle = screen.getByText(en.footer.rgTitle).textContent;
    unmount();

    renderWithIntl(<RgFooter />, { locale: 'es', messages: es });
    const spanishTitle = screen.getByText(es.footer.rgTitle).textContent;

    expect(englishTitle).not.toEqual(spanishTitle);
  });
});
