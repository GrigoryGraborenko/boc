
var fs = require('fs');
var Sequelize = require('sequelize');
var bunyan = require('bunyan');

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import App from './components/app.jsx';
import actions from './actions.js';
import decorators from './decorators.js';
const boc = require('boc')(React, ReactDOMServer);
import { RunTests } from "./autotest";

var config_env = process.env.NODE_ENV;
if(process.env.NODE_ENV === undefined) {
    config_env = "dev";
}
var config = JSON.parse(fs.readFileSync("config/" + config_env + ".json"));

// check to ensure directories exist, create them if not
["log", config.parameters.file.local_storage, config.parameters.file.temp_storage].forEach(function(check_dir) {
    try {
        fs.accessSync(check_dir);
    } catch(err) {
        fs.mkdirSync(check_dir);
    }

});

var logger = bunyan.createLogger({
    name: "core"
    ,streams: [{ level: 'debug', stream: process.stdout }].concat(config.logger.streams)
});

///////////////////////////////////////////////////////////////////////////////

function InitDB(db_name) {

    var sequelize = new Sequelize(db_name, config.db.username, config.db.password, {
        host: config.db.host
        ,dialect: config.db.type
        ,logging: config.db.logging ? function(msg) {
            fs.appendFileSync("db.log", msg.replace("Executing (default): ", "") + "\n\n");
            //logger.debug(msg);
        } : false
        ,pool: {
            idle: 20000
        }
        ,define: {
            createdAt: 'created_at'
            ,updatedAt: 'updated_at'
        }
    });

    var db = {};
    fs.readdirSync("./src/db").forEach(function(file) {
        var model = sequelize.import("../src/db/" + file);
        db[model.name] = model;
    });

    Object.keys(db).reduce(function(acc, modelName) {
        var model = db[modelName];
        if("associate" in model) {
            return acc.concat([model]);
        }
        return acc;
    }, []).forEach(function(model) {
        model.associate.apply(model, [db]);
    });

    return [sequelize, db];
}

var [sequelize, db] = InitDB(config.db.name);

///////////////////////////////////////////////////////////////////////////////

if((process.argv.length >= 3) && (process.argv[2] === "command")) {
    let commands = process.argv.slice(3);
    logger.info("Running command " + commands.join(" "));
    require('./command.js')(sequelize, db, logger, commands, config.parameters).then(function(success) {
        logger.info(success);
        process.exit();
    }, function(err) {
        logger.error(err);
        process.exit();
    });
} else {

///////////////////////////////////////////////////////////////////////////////

    let statelets = {};
    fs.readdirSync("./src/statelets").forEach(function(file) {
        statelets[file.replace(".js", "")] = require(`./statelets/${file}`);
    });

    function InitServer(sequelize_instance, db_instance, config_instance, logger_instance) {
        return boc.RunServer({
            config: config_instance
            ,orm: sequelize_instance
            ,db: db_instance
            ,logger: logger_instance
            ,app: App
            ,actions: actions
            ,decorators: decorators

            ,base_dir: (process.cwd() + "/")
            ,base_html: "src/base.html"
            ,web_dir: "web"
            ,statelets: statelets
            ,html_pre_process: function(html) {
                if((process.argv.length >= 3) && ((process.argv[2] === "dev") || (process.argv[2] === "test"))) {
                    return html.replace("vendor.js", "vendor_dev.js").replace("bundle.js", "bundle_dev.js");
                }
                return html;
            }
        });
    }

    if(process.argv[2] === "test") {
        RunTests(sequelize, logger, InitDB, InitServer).then(function() {
            process.exit(0);
        }).catch(function(err) {
            logger.error(err);
            process.exit(-1);
        });
    } else {
        InitServer(sequelize, db, config, logger);
    }
}