const nextJest = require('next/jest.js');

const createJestConfig = nextJest({
  dir: './',
});

const config = {
  displayName: 'web',
  preset: '../../jest.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/apps/web',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@betvision/ui$': '<rootDir>/../../libs/ui/src/index.ts',
    '^@betvision/contracts$': '<rootDir>/../../libs/contracts/src/index.ts',
    '^@betvision/shared$': '<rootDir>/../../libs/shared/src/index.ts',
  },
  // next-intl / use-intl / lucide-react ship ESM; let SWC transform them for the CJS test runtime.
  transformIgnorePatterns: [
    '/node_modules/(?!(next-intl|use-intl|lucide-react|@formatjs|intl-messageformat|intl-localematcher)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
};

const createConfig = createJestConfig(config);

module.exports = async () => {
  const resolved = await createConfig();
  // Disable SWC path alias resolution — handled by moduleNameMapper above.
  for (const value of Object.values(resolved.transform)) {
    if (Array.isArray(value) && value[1]?.resolvedBaseUrl) {
      value[1] = { ...value[1], resolvedBaseUrl: undefined };
    }
  }
  // next/jest hardcodes transformIgnorePatterns; override so the ESM-only i18n + icon packages
  // are transpiled by SWC for the CJS test runtime.
  resolved.transformIgnorePatterns = [
    '/node_modules/(?!(next-intl|use-intl|lucide-react|@formatjs|intl-messageformat|intl-localematcher)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ];
  return resolved;
};
