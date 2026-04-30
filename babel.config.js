module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'react' }]],
    // Reanimated 4 moved the Babel plugin into its own package.
    plugins: ['react-native-worklets/plugin'],
  };
};
