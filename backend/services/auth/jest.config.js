module.exports = {
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.check.json' }] },
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  moduleNameMapper: {
    '^@g3/contracts$': '<rootDir>/../../contracts/src/index.ts',
    '^@g3/integrations$': '<rootDir>/../../integrations-kit/src/index.ts',
    '^@g3/platform$': '<rootDir>/../../platform-kit/src/index.ts',
    '^@g3/platform/testing$': '<rootDir>/../../platform-kit/src/testing.ts',
  },
};
