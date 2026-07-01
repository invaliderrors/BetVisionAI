import { setRequestLocale } from 'next-intl/server';
import { AuthScreen } from '../../../components/auth-screen';
import { RegisterForm } from '../../../components/register-form';

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AuthScreen namespace="register">
      <RegisterForm />
    </AuthScreen>
  );
}
