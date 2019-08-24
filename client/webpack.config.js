const HtmlWebPackPlugin = require('html-webpack-plugin');
const htmlWebpackPlugin = new HtmlWebPackPlugin({
    template: './src/index.html',
    filename: './index.html'
});
module.exports = {
    entry: [
        '@babel/polyfill',
        './src/index.js',
    ],
    output: {
        filename: 'app.js',
        path: __dirname + '/dist'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                }
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: "style-loader"
                    },
                    {
                        loader: "css-loader",
                        options: {
                            modules: {
                                localIdentName: "[name]_[local]_[hash:base64]",
                            },
                            importLoaders: 1,
                            sourceMap: false
                        }
                    }
                ]
            }
        ]
    },
    devServer: {
        historyApiFallback: true,
    },
    plugins: [htmlWebpackPlugin]
};