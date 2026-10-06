module.exports = {
  root: true,
  extends: '@react-native',
  // Code của app bên thứ ba (chỉ để tham khảo) và thư mục build — không lint.
  ignorePatterns: ['cookie-manga-extracted/', 'dist/', 'screenshots/'],
  overrides: [
    {
      files: ['src/lib/id.ts', 'src/engine/lettering.ts'],
      rules: { 'no-bitwise': 'off' },
    },
  ],
};
