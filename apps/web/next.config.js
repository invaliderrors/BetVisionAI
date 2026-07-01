const { join } = require('path');
const createNextIntlPlugin = require('next-intl/plugin');

// Points next-intl at the per-request i18n config (locale + message catalog).
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Turbopack does not get confused by other lockfiles outside the
  // monorepo (silences the "inferred workspace root" warning).
  turbopack: {
    root: join(__dirname, '..', '..'),
  },
};

module.exports = withNextIntl(nextConfig);
