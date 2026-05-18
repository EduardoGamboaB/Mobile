/**
 * Jest config para G3 Admin.
 * Usamos node — tiene Response/Headers/fetch nativos. localStorage está mockeado
 * en jest.setup.js para los tests del cliente que verifican persistencia.
 */
const base = {
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
};

module.exports = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.ts'],
      ...base,
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/__tests__/e2e/**/*.test.ts'],
      ...base,
    },
  ],
};
