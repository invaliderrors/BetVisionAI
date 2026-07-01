module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
  // Run e2e suites serially: several hit a REAL Postgres and share seeded fixtures
  // (e.g. dev-match-demo-1). Parallel workers would race on destructive per-suite cleanup.
  maxWorkers: 1,
};
