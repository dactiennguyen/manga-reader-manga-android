// ESM-only packages must be compiled by Babel when running under Jest.
const ESM_PACKAGES = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  '@react-navigation',
  'react-native-.*',
  '@shopify/.*',
  '@dr.pogodin',
  '@sayem314',
  '@react-native-documents',
  'perfect-freehand',
];

module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [`node_modules/(?!(${ESM_PACKAGES.join('|')})/)`],
  testPathIgnorePatterns: ['/node_modules/', '/cookie-manga-extracted/'],
  modulePathIgnorePatterns: ['<rootDir>/cookie-manga-extracted/'],
};
