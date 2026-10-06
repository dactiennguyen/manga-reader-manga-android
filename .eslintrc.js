module.exports = {
  root: true,
  extends: '@react-native',
  // Third-party reference code and build output are not linted.
  ignorePatterns: ['cookie-manga-extracted/', 'dist/', 'screenshots/'],
  overrides: [
    {
      files: ['src/lib/id.ts', 'src/engine/lettering.ts'],
      rules: { 'no-bitwise': 'off' },
    },
  ],
};
