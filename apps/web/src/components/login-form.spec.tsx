import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderWithIntl, enMessages as en } from '../test/test-utils';

const mockReplace = jest.fn();
jest.mock('../i18n/navigation', () => ({
  __esModule: true,
  Link: ({ children }: { children?: ReactNode }) => children,
  useRouter: () => ({ replace: mockReplace, push: mockReplace }),
  usePathname: () => '/login',
}));

// Imported after the mock is registered.
import { LoginForm } from './login-form';
import { useAuthStore } from '../lib/auth/auth-store';

describe('LoginForm', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('shows localized validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LoginForm />);

    await user.click(screen.getByRole('button', { name: en.login.submit }));

    expect(
      await screen.findByText(en.validation.emailRequired),
    ).toBeInTheDocument();
    expect(screen.getByText(en.validation.passwordRequired)).toBeInTheDocument();
  });

  it('submits valid credentials via the auth store and navigates to the dashboard', async () => {
    const login = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ login });
    const user = userEvent.setup();
    renderWithIntl(<LoginForm />);

    await user.type(screen.getByLabelText(en.login.email), 'analyst@betvision.ai');
    await user.type(screen.getByLabelText(en.login.password), 'Sup3rSecret!!');
    await user.click(screen.getByRole('button', { name: en.login.submit }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith(
        { email: 'analyst@betvision.ai', password: 'Sup3rSecret!!' },
        'en',
      ),
    );
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/dashboard'),
    );
  });
});
