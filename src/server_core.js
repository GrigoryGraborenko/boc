/**
 * Created by Grigory on 15-Feb-17.
 */
'use strict';

const fs = require('fs');
const zlib = require("zlib");
const util = require('util');

const multiparty = require('multiparty');

const gzipAsync = util.promisify(zlib.gzip);

const Store = require('./store.js');
const StateBuilder = require('./state_builder.js');

module.exports = function(React, ReactDOMServer, static_files, html_base, tools) {

    var logger = tools.logger;

    /// downloading of request body
    function handleRequestBody(request) {
        var body = "";
        request.on('data', function(chunk) {
            body += chunk.toString();
        });
        return new Promise(function (fulfill, reject) {
            request.on('end', function () {
                fulfill(body);
            });
        });
    }

    /// downloading of multipart form request body with files
    function handleMultipartRequestBody(request) {

        var form = new multiparty.Form({ uploadDir: tools.config.parameters.file.temp_storage });

        return new Promise(function (fulfill, reject) {
            form.parse(request, function(err, fields, files) {
                if(err) {
                    reject(err);
                    return;
                }
                fulfill({ fields: fields, files: files });
            });
        });
    }

    /// core handler
    async function handleRequest(url, request, response) {

        logger.trace("Received request body");

        var store = Store(tools.actions, tools.decorators);
        var route = store.processURL(url);

        if(route === null) {
            logger.debug("No route for URL: " + url);
            response.writeHead(404);
            response.end();
            return;
        }

        if(request.method !== "GET") {
            let input = {};
            let params = {};

            if(request.headers['content-type'] && (request.headers['content-type'].indexOf("multipart/form-data") !== -1)) {

                let data = await handleMultipartRequestBody(request);
                let json_input = JSON.parse(data.fields.input[0]);
                params = json_input.data;
                input = { data: params };
                route.page = json_input.page;

                /// rearrange files into accessible form
                route.files = {};
                for(let file_key in data.files) {
                    let parts = file_key.split("___");
                    if(parts.length <= 0) {
                        parts = ["file"];
                    }
                    if(route.files[parts[0]] === undefined) {
                        route.files[parts[0]] = [];
                    }
                    route.files[parts[0]].push(data.files[file_key][0]);
                }

            } else {
                let body = await handleRequestBody(request);

                if(request.headers['content-type'] && (request.headers['content-type'].indexOf("application/x-www-form-urlencoded") !== -1)) {
                    body.split('&').forEach(function (pair) {
                        var parts = pair.trim().split('=');
                        if (parts.length === 2) {
                            params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
                        }
                    });
                } else if(body.length > 0) {
                    try {
                        input = JSON.parse(body);
                        params = input.data;
                    } catch (err) {
                        params = {};
                    }
                }
            }

            if((route === null) || (route.post !== true)) {
                route = { name: url.replace("/", ""), params: params };
            } else {
                route.params = Object.assign({}, route.params, params );
            }
            if(input.page !== undefined) {
                route.params = Object.assign({}, input.page.params, route.params);
                route.page = input.page.name;
            }
        }

        var state_builder = StateBuilder(tools.config.parameters, tools.orm, tools.db, tools.logger, tools.decorators, tools.statelets, request, route, response);

        var entry = route.entry || "boot";

        try {
            var initial_data = await state_builder.get(entry);
            Object.assign(initial_data, state_builder.getAllCookies());
        } catch(error) {
            var initial_data = null;
            logger.debug("Error", error);

            if(typeof error === "string") {
                if(request.method === "GET") {
                    response.writeHead(400);
                    response.end();
                    // TODO: finish this
                } else {
                    response.writeHead(400, {"Content-Type": "application/json"});
                    response.write(JSON.stringify({error: error}));
                    response.end();
                }
            } else {
                response.writeHead(500);
                response.end();
            }
        }

        /// delete temp files
        if(route.files) {
            for(let file_key in route.files) {
                route.files[file_key].forEach(function(file) {
                    fs.unlink(file.path, function(err) {
                        if(err) {
                            logger.error("Could not delete file at " + file.path);
                        }
                    });
                });
            }
        }

        if(initial_data === null) {
            return;
        }
        if(state_builder.getManualResponse()) {
            logger.trace("Deferring to manual response");
            return;
        }

        if(request.method === "GET") {

            if(route.file) {

                var header = {};
                if(typeof route.file === "string") {
                    header["Content-Type"] = route.file;
                }

                var output_headers = state_builder.getAllOutputHeaders(header);
                var output = state_builder.getFileOutput();
                if(output === null) {
                    logger.error("No file output on route", route);
                    response.writeHead(500);
                    response.end();
                } else {
                    response.writeHead(200, output_headers);
                    response.write(output);
                    response.end();
                    logger.trace("Wrote file response");
                }

            } else {

                if (initial_data.route === undefined) {
                    initial_data.route = route;
                }
                var initial_data_str = JSON.stringify(initial_data);
                try {
                    store.setInitialData(initial_data, false);
                } catch (err) {
                    logger.error("Detected error on data processing", err);
                    response.writeHead(500, {});
                    response.end();
                    return;
                }
                var output_headers = state_builder.getAllOutputHeaders({"Content-Type": "text/html"});

                try {
                    var element = React.createElement(tools.app, { store: store, client: false });
                    var html_react = ReactDOMServer.renderToStaticMarkup(element);
                } catch (err) {
                    logger.error("Detected error on react render", err);
                    response.writeHead(500, {});
                    response.end();
                    return;
                }

                let payload = html_base[0] + html_react + html_base[1];
                payload += "<script>var g_InitialData = " + initial_data_str + ";</script>" + html_base[2];

                let comp_min = tools.config.server.compression_min_get;
                if(comp_min && (comp_min >= 0) && (comp_min < payload.length)) {
                    output_headers["Content-Encoding"] = "gzip";

                    payload = await gzipAsync(Buffer.from(payload));
                }

                response.writeHead(200, output_headers);
                response.write(payload);
                response.end();

                logger.trace("Wrote HTML response");
            }
        } else {
            let output_headers = state_builder.getAllOutputHeaders({ "Content-Type": "application/json" });

            let payload = JSON.stringify(initial_data);

            let comp_min = tools.config.server.compression_min_post;
            if(comp_min && (comp_min >= 0) && (comp_min < payload.length)) {
                output_headers["Content-Encoding"] = "gzip";
                payload = await gzipAsync(Buffer.from(payload));
            }

            response.writeHead(200, output_headers);
            response.write(payload);
            response.end();
            logger.trace("Wrote POST response");
        }
    }

    /// entry point
    return function(request, response) {

        logger.trace("Incoming request", request.url);

        var url = request.url;
        if(url.indexOf("?") !== -1) {
            url = url.slice(0, url.indexOf("?"));
        }

        /// static file handler
        if(request.method === "GET") {
            const file = static_files[url];
            if(file !== undefined) {
                const headers = { "Content-Type": file.content_type, "Cache-Control": file.cache_control };
                let encoding = "binary";
                if(file.encoding) {
                    encoding = file.encoding;
                    headers["Content-Type"] += "; charset=" + file.encoding;
                }
                response.writeHead(200, headers);
                response.end(file.file, encoding);
                return;
            }
        }

        handleRequest(url, request, response).then(function() {
            logger.trace("Successful request", request.url);
        }, function(err) {
            logger.error("Failed request", request.url, err);
            response.writeHead(500);
            response.end();
        });
    }
};
