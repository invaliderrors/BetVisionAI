'use client';
// apps/web/src/components/auth-bootstrap.tsx
// Runs once on load: attempts a silent /auth/refresh (via the httpOnly cookie) to restore the
// in-memory session after a reload. Renders nothing.
import { useEffect } from 'react';
import { useAuthStore } from '../lib/auth/auth-store';

export function AuthBootstrap({ locale }: { locale: string }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap(locale);
  }, [bootstrap, locale]);

  return null;
}
