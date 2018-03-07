/**
 * Created by Grigory on 6/03/2018.
 */
'use strict';

const RunServer = require("./src/server.js");

/**
 * RunServer requires tools object, which contains:
 *
 * config
 * orm
 * db
 * logger
 * app
 * actions
 * decorators
 * base_dir
 * base_html
 * web_dir
 * statelets
 * html_pre_process
 */

module.exports = function(React, ReactDOMServer) {
    return {
        RunServer: RunServer.bind(null, React, ReactDOMServer)
    }
};