//@ts-check

const { join } = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Turbopack does not get confused by other
  // lockfiles outside the monorepo (silences the "inferred workspace root" warning).
  turbopack: {
    root: join(__dirname, '..', '..'),
  },
  // Next.js options go here
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js
};

module.exports = nextConfig;
