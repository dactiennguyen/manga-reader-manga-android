module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Plugin worklets (cho Reanimated/Skia) phải đứng cuối.
  plugins: ['react-native-worklets/plugin'],
};
