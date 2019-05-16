var path = require('path');
var UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  context: __dirname + './src/',
  entry: path.resolve(__dirname, './src/index.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'crypto-pro.js'
  },
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' }
    ]
  },
  mode: 'production',
  target: 'node',
  devtool: 'source-map',
  devServer: {
    contentBase: path.join(__dirname, './dist'),
    compress: true,
    port: 9000
  },
  watch: true
};
