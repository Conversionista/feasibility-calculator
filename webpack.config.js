const webpack = require('webpack'); 
module.exports = {
  entry: ['./dev-js/App.js'], 
  output: {
    publicPath: '/dist/', 
    path: __dirname + '/dist', 
    filename: 'bundle.js'
  },
   module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.js$/,            
        exclude: /node_modules/,  
        loader: 'jshint-loader'
      },
     {
       test: /\.js$/,             
       exclude: /node_modules/,
       loader: 'babel-loader',
       query: {
        presets: ['es2015']    
       }
     },
    {
     test: /\.scss$/,                    
      loaders: ["style-loader", "css-loader", "sass-loader"], 
    },
    {
      test: /\.woff($|\?)|\.woff2($|\?)|\.ttf($|\?)|\.eot($|\?)|\.svg($|\?)/,
      loader: 'url-loader'
    },
   { 
     test: /.(jpe?g|png)$/,                       
     loader: 'file?name=img/[name].[hash].[ext]' //emits image files as file in the img folder in dist folder, filename MD5 hash, and returns the public url used in bundle.js 
   },
   { 
    test: require.resolve("jquery"), 
    loader: "expose-loader?$!expose-loader?jQuery" 
    }
   ]
 },
  plugins: [
        //built-in plugin to minify bundle
        new webpack.optimize.UglifyJsPlugin({ 
            compress: {
                warnings: false,
            },
            output: {
                comments: false,
            },
        }),
        new webpack.ProvidePlugin({
           $: "jquery",
           jQuery: "jquery"
       })
    ],

 resolve: {
   extensions: ['.js', '.css', '.png', 'scss', 'jpeg', 'jpg'] 
 },
}