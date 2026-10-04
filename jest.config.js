// Các package chỉ phát hành dạng ESM cần được Babel biên dịch khi chạy Jest.
const ESM_PACKAGES = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  '@react-navigation',
  'react-native-.*',
  '@shopify/flash-list',
  'lucide-react-native',
  '@dr.pogodin',
  '@preeternal',
  '@mhpdev',
  '@sayem314',
  '@react-native-clipboard',
  '@react-native-documents',
];

module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Bản ESM của lucide là .mjs (babel-jest không xử lý) — dùng bản CommonJS.
  moduleNameMapper: {
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  transformIgnorePatterns: [`node_modules/(?!(${ESM_PACKAGES.join('|')})/)`],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/helpers/', '/cookie-manga-extracted/'],
  modulePathIgnorePatterns: ['<rootDir>/cookie-manga-extracted/'],
};
