// Test chạy thật trên site nguồn (cần mạng): `npm run test:live`.
// Không nằm trong `npm test` vì phụ thuộc site bên ngoài và mất vài phút.
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.(js|ts|tsx)$': 'babel-jest' },
  testMatch: ['<rootDir>/__tests__/live/**/*.live.ts'],
  setupFiles: ['<rootDir>/__tests__/live/setup.js'],
  testTimeout: 60 * 60 * 1000,
};
