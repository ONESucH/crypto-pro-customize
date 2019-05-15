var path = require('path');

module.exports = {
    context: __dirname + '/src',
    entry: './cadesplugin-api.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'crypto-pro.js'
    },
    devtool: 'source-map'
};