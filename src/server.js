/**
 * Created by Grigory on 15-Feb-17.
 */

const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

const server_core = require('./server_core.js');

function crawlFiles(file_list, dir, prefix) {
    fs.readdirSync(dir).forEach(function(filename) {
        var filepath = dir + "/" + filename;
        var ext = filename.substr(filename.lastIndexOf("."));
        var stats = fs.statSync(filepath);
        if(!stats.isDirectory()) {

            var file = fs.readFileSync(filepath);
            var file_obj = { filename: filename, filepath: filepath, extension: ext, cache_control: "public, max-age=2419200" };
            if(ext === ".css") {
                file_obj.content_type = "text/css";
                //file_obj.cache_control = "max-age: 0";
                file_obj.file = file + "";
            } else if(ext === ".jpg") {
                file_obj.content_type = "image/jpg";
                //file_obj.cache_control = "max-age: 120";
                file_obj.file = file;
            } else if(ext === ".png") {
                file_obj.content_type = "image/png";
                //file_obj.cache_control = "max-age: 120";
                file_obj.file = file;
            } else if(ext === ".woff") {
                file_obj.content_type = "font/woff";
                file_obj.file = file;
            } else if(ext === ".woff2") {
                file_obj.content_type = "font/woff2";
                file_obj.file = file;
            } else if(ext === ".js") {
                file_obj.content_type = "text/script";
                file_obj.encoding = "utf-8";
                //file_obj.cache_control = "max-age: 0";
                file_obj.file = file + "";
            } else {
                file_obj.content_type = "text/script";
                file_obj.file = file + "";
            }
            file_list[prefix + filename] = file_obj;
        } else {
            crawlFiles(file_list, dir + "/" + filename, prefix + filename + "/");
        }
    });
}

module.exports = function(React, ReactDOMServer, tools) {

    var static_files = {};
    crawlFiles(static_files, tools.base_dir + tools.web_dir, "/");
    var html_base = fs.readFileSync(tools.base_dir + tools.base_html) + "";

    /// switch to dev build using this function
    if(tools.html_pre_process) {
        html_base = tools.html_pre_process(html_base);
    }

    /// hashing of files included in html.base
    var manifest = {};
    for(let name in static_files) {
        let index = html_base.indexOf(name);
        if(index >= 0) {
            let hash = crypto.createHash('sha256');
            hash.update(static_files[name].file);
            hash = hash.digest('hex');
            manifest[name] = hash.slice(0, 8);
        }
    }

    /// insertion of filenames with file hash
    for(let name in manifest) {
        let new_name = name.replace(".", "-" + manifest[name] + ".");
        html_base = html_base.replace(name, new_name);
        static_files[new_name] = static_files[name];
        delete static_files[name];
    }

    html_base = html_base.split("####");

    var config = tools.config.server;
    var server_handler = server_core(React, ReactDOMServer, static_files, html_base, tools);

    if(config.ssl.enable) {
        var port = config.server.ssl.port;
        var server = https.createServer({
            ca: fs.readFileSync(config.ssl.ca)
            ,key: fs.readFileSync(config.ssl.key)
            ,cert: fs.readFileSync(config.ssl.cert)
            ,requestCert: false
            ,rejectUnauthorized: false
        }, server_handler);
        tools.logger.info("STARTING SSL SERVER on port " + port + " with redirect server on port " + config.port);
        server.listen(port);

        var redirect_server = http.createServer(function (request, response) {
            tools.logger.trace("Incoming HTTP request on port 80", request.url);
            if(request.method !== "GET") {
                tools.logger.trace("Non-GET method on port 80");
                response.writeHead(400);
                response.end();
                return;
            }
            response.writeHead(301, {
                Location: ('https://' + request.headers.host + request.url)
            });
            response.end();
        });
        redirect_server.listen(config.port);

    } else {
        var server = http.createServer(server_handler);
        tools.logger.info("STARTING SERVER on port " + config.port);
        server.listen(config.port);
    }
};