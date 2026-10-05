/* eslint-env jest */
// Test chạy thật ở môi trường Node: MMKV (registry addon, cache) thay bằng bộ nhớ.
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    const map = new Map();
    return {
      set: (key, value) => map.set(key, value),
      getString: key => (typeof map.get(key) === 'string' ? map.get(key) : undefined),
      getNumber: key => (typeof map.get(key) === 'number' ? map.get(key) : undefined),
      getBoolean: key => (typeof map.get(key) === 'boolean' ? map.get(key) : undefined),
      contains: key => map.has(key),
      remove: key => map.delete(key),
      getAllKeys: () => [...map.keys()],
      clearAll: () => map.clear(),
    };
  },
}));
global.__DEV__ = false;
