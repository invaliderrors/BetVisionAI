const path = require('path');
const { join, relative, sep } = path;
const createNextIntlPlugin = require('next-intl/plugin');

// Relative-from-cwd path so next-intl resolves the config whether cwd is the workspace root
// (Nx graph inference / `nx build`) or apps/web (direct `next build`). Absolute paths are rejected.
const requestConfig =
  './' + relative(process.cwd(), join(__dirname, 'src', 'i18n', 'request.ts')).split(sep).join('/');
const withNextIntl = createNextIntlPlugin(requestConfig);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Turbopack does not get confused by other lockfiles outside the
  // monorepo (silences the "inferred workspace root" warning).
  turbopack: {
    root: join(__dirname, '..', '..'),
  },
};

module.exports = withNextIntl(nextConfig);
