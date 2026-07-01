'use client';

// Minimal, dependency-free global error boundary. Next 16's default synthesized `/_global-error`
// pulls context that is null during static export (`useContext of null`); a plain custom one that
// renders its own <html>/<body> and uses no i18n/query/context prerenders cleanly. Copy is
// intentionally hardcoded English here (this file renders OUTSIDE the next-intl provider tree, and
// a crashed app can't be trusted to have locale context) — the only such exception in the app.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          background: '#0C1119',
          color: '#E6EAF0',
        }}
      >
        <main style={{ maxWidth: '32rem', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ opacity: 0.7, marginTop: '0.75rem' }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              padding: '0.5rem 1.25rem',
              borderRadius: '0.5rem',
              border: '1px solid #2A3546',
              background: '#4C9DE0',
              color: '#0C1119',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
