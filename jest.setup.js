/* eslint-env jest */
// Mock module native để test chạy được trong Node.

// MMKV v4 nạp Nitro ngay khi import nên phải thay bằng bản lưu trong bộ nhớ.
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

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      reload: jest.fn(),
      goBack: jest.fn(),
      goForward: jest.fn(),
      stopLoading: jest.fn(),
      injectJavaScript: jest.fn(),
      requestFocus: jest.fn(),
    }));
    return React.createElement(View, { testID: props.testID });
  });
  return { __esModule: true, default: WebView, WebView };
});

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
  stopDownload: jest.fn(),
  downloadFile: jest.fn(() => ({
    jobId: 1,
    promise: Promise.resolve({ jobId: 1, statusCode: 200, bytesWritten: 0 }),
  })),
}));

jest.mock('@preeternal/react-native-cookie-manager', () => ({
  __esModule: true,
  default: {
    clearAll: jest.fn(async () => true),
    get: jest.fn(async () => ({})),
    getAsArray: jest.fn(async () => []),
    clearByName: jest.fn(async () => true),
    flush: jest.fn(async () => {}),
  },
}));

jest.mock('@mhpdev/react-native-speech', () => {
  const subscription = () => ({ remove: jest.fn() });
  return {
    __esModule: true,
    default: {
      maxInputLength: 4000,
      configure: jest.fn(),
      speak: jest.fn(async () => 'id'),
      stop: jest.fn(async () => {}),
      pause: jest.fn(async () => true),
      resume: jest.fn(async () => true),
      isSpeaking: jest.fn(async () => false),
      onStart: jest.fn(subscription),
      onFinish: jest.fn(subscription),
      onError: jest.fn(subscription),
      onStopped: jest.fn(subscription),
      onPause: jest.fn(subscription),
      onResume: jest.fn(subscription),
      onProgress: jest.fn(subscription),
    },
  };
});

jest.mock('react-native-camera-kit', () => {
  const { View } = require('react-native');
  return { Camera: View, CameraType: { Back: 'back', Front: 'front' } };
});

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: { setString: jest.fn(), getString: jest.fn(async () => '') },
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
  types: { json: 'application/json', allFiles: '*/*' },
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: () => false,
}));
