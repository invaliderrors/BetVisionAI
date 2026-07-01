import type { ReactNode } from 'react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { screen, waitFor } from '@testing-library/react';
import {
  renderWithIntl,
  renderWithProviders,
  enMessages as en,
} from './test-utils';

expect.extend(toHaveNoViolations);

jest.mock('../i18n/navigation', () => ({
  __esModule: true,
  Link: ({ children }: { children?: ReactNode }) => children,
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => '/',
}));

import { LoginForm } from '../components/login-form';
import { DashboardView } from '../components/dashboard-view';
import { useAuthStore } from '../lib/auth/auth-store';

describe('accessibility (WCAG via axe)', () => {
  it('login form has no detectable a11y violations', async () => {
    const { container } = renderWithIntl(<LoginForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('dashboard shell has no detectable a11y violations', async () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'analyst@betvision.ai',
        role: 'user',
        locale: 'en',
      },
      status: 'authenticated',
    });

    const { container } = renderWithProviders(<DashboardView />);
    // Wait for the (empty) data panels to settle out of their loading state.
    await waitFor(() =>
      expect(
        screen.getByText(en.dashboard.empty.recentPredictions),
      ).toBeInTheDocument(),
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
