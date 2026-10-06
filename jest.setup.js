/* eslint-env jest */
// Mock native modules so tests can run in Node.

// MMKV v4 loads Nitro on import, so it is replaced with an in-memory store.
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

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@dr.pogodin/react-native-fs', () => ({
  DocumentDirectoryPath: '/doc',
  CachesDirectoryPath: '/cache',
  DownloadDirectoryPath: '/download',
  TemporaryDirectoryPath: '/tmp',
  exists: jest.fn(async () => false),
  mkdir: jest.fn(async () => {}),
  readFile: jest.fn(async () => ''),
  writeFile: jest.fn(async () => {}),
  unlink: jest.fn(async () => {}),
  readDir: jest.fn(async () => []),
  stat: jest.fn(async () => ({ size: 0 })),
  copyFile: jest.fn(async () => {}),
  moveFile: jest.fn(async () => {}),
}));

jest.mock('@sayem314/react-native-keep-awake', () => ({
  activateKeepAwake: jest.fn(),
  deactivateKeepAwake: jest.fn(),
  useKeepAwake: jest.fn(),
}));

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(async () => []),
  keepLocalCopy: jest.fn(async () => []),
  saveDocuments: jest.fn(async () => []),
  types: { json: 'application/json', allFiles: '*/*', images: 'image/*', zip: 'application/zip' },
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: () => false,
}));
