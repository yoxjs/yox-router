var webpack = require('webpack');
var env = process.env.WEBPACK_ENV;

var plugins = [ ];
var outputFilename = '.js';

if (env === 'release') {
    outputFilename = '.min' + outputFilename;
    plugins.push(
        new webpack.optimize.UglifyJsPlugin({
            minimize: true
        })
    );
}
else if (env === 'dev') {
    plugins.push(
        new webpack.HotModuleReplacementPlugin()
    );
}

module.exports = {

    entry: __dirname + '/src/index.js',
    output: {
        path: __dirname + '/dist',
        filename: 'yox-router' + outputFilename,
        library: 'YoxRouter',
        libraryTarget: 'umd',
        umdNamedDefine: true
    },

    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015', 'stage-0']
                }
            }
        ],
        postLoaders: [
            {
                test: /\.js$/,
                loader: 'es3ify-loader'
            }
        ]
    },

    plugins: plugins,

    devServer: {
        port: 9193,
        hot: true,
        inline: true,
    }
}
