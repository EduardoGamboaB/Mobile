/* eslint-disable @typescript-eslint/no-require-imports */
process.env.EXPO_PUBLIC_G3_API_URL = 'https://api.g3.test';
process.env.EXPO_PUBLIC_DEMO = '0';

// fetch polyfill mínimo — los tests inyectan mocks por llamada
if (typeof global.fetch !== 'function') {
  global.fetch = () => {
    throw new Error('fetch no inyectado: pásalo en opts.fetchImpl o usa makeFetchMock()');
  };
}
