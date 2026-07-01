import { setRequestLocale } from 'next-intl/server';
import { AuthScreen } from '../../../components/auth-screen';
import { LoginForm } from '../../../components/login-form';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AuthScreen namespace="login">
      <LoginForm />
    </AuthScreen>
  );
}
