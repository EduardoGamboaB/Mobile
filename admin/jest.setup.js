process.env.NEXT_PUBLIC_G3_API_URL = 'https://api.g3.test';
process.env.NEXT_PUBLIC_DEMO = '0';

// Mock mínimo de window+localStorage para que el cliente persista tokens.
const storage = new Map();
const localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

global.window = { localStorage };
global.localStorage = localStorage;
