const path = require('path');

module.exports = {
  entry: {
    background: './src/background.ts',
    content: './src/content.ts',
    offscreen: './src/offscreen.ts'
  },
  output: {
    path: path.resolve(__dirname, 'MdPicker', 'js'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
