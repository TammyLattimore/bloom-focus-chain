// Minimal AsyncStorage stub for web bundlers.
// Used to avoid bundling React Native storage when using wagmi + MetaMask.

type Value = string | null;

const store = new Map<string, string>();

const AsyncStorage = {
  async getItem(key: string): Promise<Value> {
    return store.has(key) ? store.get(key)! : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
  async clear(): Promise<void> {
    store.clear();
  },
  // Compatibility no-ops
  async getAllKeys(): Promise<string[]> {
    return Array.from(store.keys());
  },
};

export default AsyncStorage;

