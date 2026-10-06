module.exports = {
  root: true,
  extends: '@react-native',
  // Code của app bên thứ ba (chỉ để tham khảo) và file sinh tự động — không lint.
  ignorePatterns: ['cookie-manga-extracted/', 'dist/', 'src/addons/builtin.generated.ts'],
  overrides: [
    {
      files: ['src/lib/base64.ts', 'src/lib/id.ts', 'src/lib/sha256.ts'],
      rules: { 'no-bitwise': 'off' },
    },
    {
      files: ['src/addons/registry.ts', '__tests__/browserScripts.test.ts'],
      rules: { 'no-new-func': 'off' },
    },
    {
      files: ['__tests__/browserScripts.test.ts'],
      rules: { 'no-script-url': 'off' },
    },
  ],
};
