module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // htmlparser2 (qua cheerio) bản ESM dùng `export * as …`, preset RN chưa xử lý cú pháp này.
  plugins: ['@babel/plugin-transform-export-namespace-from'],
};
