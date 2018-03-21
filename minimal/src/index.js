/**
 * Created by Grigory on 7/03/2018.
 */

const fs = require('fs');
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import App from './components/app.jsx';
import actions from './actions.js';
import decorators from './decorators.js';
const boc = require('boc')(React, ReactDOMServer);

var config = {
    "server": {
        "port": 80,
        "ssl": {
            "enable": false,
            "port": 443,
            "ca": null,
            "key": null,
            "cert": null
        }
    },
    "parameters": {
    }
};

let statelets = {};
fs.readdirSync("./src/statelets").forEach(function(file) {
    statelets[file.replace(".js", "")] = require(`./statelets/${file}`);
});

boc.RunServer({
    config: config
    ,orm: {}
    ,db: {}
    ,logger: null
    ,app: App
    ,actions: actions
    ,decorators: decorators

    ,base_dir: (process.cwd() + "/")
    ,base_html: "src/base.html"
    ,web_dir: "web"
    ,statelets: statelets
    ,html_pre_process: function(html) {
        if((process.argv.length >= 3) && (process.argv[2] === "dev")) {
            return html.replace("vendor.js", "vendor_dev.js").replace("bundle.js", "bundle_dev.js");
        }
        return html;
    }
});