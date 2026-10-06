module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // The worklets plugin (used by Reanimated and Skia) must be listed last.
  plugins: ['react-native-worklets/plugin'],
};
