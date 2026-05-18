const store = new Map<string, string>();

export default {
  getItem: async (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: async (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: async (k: string) => {
    store.delete(k);
  },
  clear: async () => {
    store.clear();
  },
  /** helper para tests — limpia entre suites */
  __reset: () => store.clear(),
};
