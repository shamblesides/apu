const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => ({
  entry: {
    main: './lib/APU.js'
  },
  output: {
    filename: `apu.js`,
    ...(argv.mode === 'development' ? {} : {libraryTarget: 'commonjs2'}),
  },
  module: {
    rules: [
      {
        test: /\.worklet.js$/,
        use: {
          loader: 'raw-loader',
        }
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
          {
            loader: path.resolve('./tools/clang-loader.js'),
          },
        ]
      },
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          }
        }
      },
      {
        test: /\.vgm$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
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
