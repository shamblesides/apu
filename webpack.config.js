const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => ({
  entry: {
    main: './lib/index.ts'
  },
  output: {
    filename: `apu.js`,
    ...(argv.mode === 'development' ? {

    } : {
      library: 'APU',
      libraryTarget: 'umd'
    }),
  },
  module: {
    rules: [
      {
        test: /\.worklet.js$/,
        use: (argv.mode === 'development') ? [
          'raw-loader',
          'babel-loader',
        ] : [
          'raw-loader',
          path.resolve('./tools/terser-loader.js'),
          'babel-loader',
        ],
      },
      {
        test: /\.c$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              mimetype: 'application/wasm',
            },
          },
          path.resolve('./tools/clang-loader.js'),
        ]
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
      },
      {
        test: /\.vgm$/i,
        use: 'file-loader',
      },
    ]
  },
  plugins: (argv.mode === 'development') ? [
    new webpack.ProgressPlugin(),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      title: 'test',
      meta: {
        viewport: "width=device-width, user-scalable=no",
      }
    }),
  ] : [
    new webpack.ProgressPlugin(),
    new CleanWebpackPlugin(),
  ],
});
