import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/jest.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/jest.setup.ts',
            '{projectRoot}/src/**/*.spec.{ts,tsx}',
            '{projectRoot}/src/**/*.test.{ts,tsx}',
          ],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
