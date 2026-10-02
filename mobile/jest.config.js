/**
 * Jest config para G3 mobile.
 *
 * Las pruebas de la capa `api/g3` corren en jsdom + fetch mockeado: no
 * dependen de RN nativo. Las pruebas de stores/integración usan el mismo
 * entorno porque las dependencias nativas (AsyncStorage, expo-constants)
 * están mockeadas en `__mocks__/` (AsyncStorage, expo-constants, expo-notifications).
 */
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^expo-constants$': '<rootDir>/__mocks__/expo-constants.ts',
        '^expo-notifications$': '<rootDir>/__mocks__/expo-notifications.ts',
        '^@react-native-async-storage/async-storage$':
          '<rootDir>/__mocks__/async-storage.ts',
      },
      setupFiles: ['<rootDir>/jest.setup.js'],
    },
    {
      displayName: 'e2e',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/e2e/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^expo-constants$': '<rootDir>/__mocks__/expo-constants.ts',
        '^expo-notifications$': '<rootDir>/__mocks__/expo-notifications.ts',
        '^@react-native-async-storage/async-storage$':
          '<rootDir>/__mocks__/async-storage.ts',
      },
      setupFiles: ['<rootDir>/jest.setup.js'],
    },
  ],
};
