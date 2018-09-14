/**
 * Created by Grigory on 18-Mar-18.
 */

const webpack = require('webpack');
const path = require('path');
var fs = require('fs');

var nodeModules = {};
fs.readdirSync('node_modules')
    .filter(function(x) {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach(function(mod) {
        nodeModules[mod] = 'commonjs ' + mod;
    });

var isVendor = function(obj) {
    return (
        obj.resource &&
        obj.resource.indexOf('node_modules') >= 0 &&
        obj.resource.match(/\.js$/)
    );
};

module.exports = function(env) {

    var is_prod = (env && env.production) === true;

    console.log("Running with production flag set to " + (is_prod ? "TRUE" : "FALSE"));

    var build_plugins = [];
    var vender_bundle_name = "web/vendor";
    var bundle_name = "web/bundle";
    if(is_prod) {
        build_plugins.push(new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('production')
            }
        }));
    } else {

        var server_dll_plugins = [];
        var dll_manifest = 'server.dll.json';
        if(fs.existsSync("./build_dev/" + dll_manifest)) {
            server_dll_plugins = [
                new webpack.DllReferencePlugin({
                    context: process.cwd()
                    ,manifest: require(path.join(__dirname, "build_dev", dll_manifest))
                })
                ,new webpack.BannerPlugin({
                    banner: "eval(require('fs').readFileSync('./build_dev/server.dll.js')+'');",
                    raw: true,
                    entryOnly: false
                })
            ];
        } else {
            console.log("============= Re-run webpack to use DLL =============");
        }

        vender_bundle_name = "web/vendor_dev";
        bundle_name = "web/bundle_dev";
    }

    var client_entry = {};
    client_entry[bundle_name] = __dirname + "/src/app-client.js";

    var tasks = [];
    tasks.push({

        ///////////////////////////////////////////////////////////////////////////////
        // client-side
        ///////////////////////////////////////////////////////////////////////////////

        entry: client_entry,
        output: {
            path: path.join(__dirname),
            filename: '[name].js'
        },
        module: {
            loaders: [
                {
                    test: path.join(__dirname, 'src'),
                    loader: 'babel-loader',
                    query: {
                        cacheDirectory: 'babel_cache',
                        presets: ['react', 'es2015-ie']
                    }
                }
            ]
        },
        plugins: build_plugins.concat([
            new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
            ,new webpack.optimize.CommonsChunkPlugin({
                name: vender_bundle_name
                ,minChunks: isVendor
            })
        ])

    });

    if(is_prod) {

        tasks.push({

            ///////////////////////////////////////////////////////////////////////////////
            // server-side
            ///////////////////////////////////////////////////////////////////////////////

            entry: __dirname + "/src/index.js",
            target: 'node',
            externals: nodeModules,
            cache: true,
            output: {
                path: path.join(__dirname, 'build'),
                filename: 'server.js'
            },
            module: {
                loaders: [
                    {
                        test: path.join(__dirname, 'src'),
                        loader: 'babel-loader',
                        query: {
                            cacheDirectory: 'babel_cache',
                            presets: [
                                'react',
                                ["env", { "targets": { "node": true } }]
                            ]
                        }
                    }
                    ,{
                        test: /\.json$/,
                        loaders: ['json-loader']
                    }
                ]
            },
            plugins: [
                new webpack.DefinePlugin({
                    'process.env.NODE_ENV': JSON.stringify("production")
                })
            ]
        });

    } else {

        tasks.push({

            ///////////////////////////////////////////////////////////////////////////////
            // dll, server-side
            ///////////////////////////////////////////////////////////////////////////////

            context: process.cwd(),
            target: 'node',
            cache: true,
            entry: {
                server: [
                    'react'
                    ,'react-dom'
                ]
            },

            output: {
                filename: '[name].dll.js',
                path: path.join(__dirname, 'build_dev'),
                library: '[name]'
            },

            plugins: [
                new webpack.DllPlugin({
                    name: '[name]',
                    path: path.join(__dirname, 'build_dev', '[name].dll.json')
                })
            ]
        });
        tasks.push({

            ///////////////////////////////////////////////////////////////////////////////
            // server-side
            ///////////////////////////////////////////////////////////////////////////////

            entry: __dirname + "/src/index.js",
            target: 'node',
            externals: nodeModules,
            cache: true,
            devtool: 'sourcemap',
            output: {
                path: path.join(__dirname, 'build_dev'),
                filename: 'server.js'
            },
            module: {

                loaders: [
                    {
                        test: path.join(__dirname, 'src'),
                        loader: 'babel-loader',
                        query: {
                            cacheDirectory: 'babel_cache',
                            presets: [
                                'react',
                                ["env", { "targets": { "node": true } }]
                            ]

                        }
                    }
                    ,{
                        test: /\.json$/,
                        loaders: ['json-loader']
                    }
                ]
            },
            plugins: server_dll_plugins.concat([
                new webpack.BannerPlugin({ banner: 'require("source-map-support").install();', raw: true, entryOnly: false })
            ])
        });
    }

    return tasks;
};