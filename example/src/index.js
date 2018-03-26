/**
 * Created by Grigory on 7/03/2018.
 */

const fs = require('fs');
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import App from './components/app.jsx';
import actions from './actions.js';
import decorators from './decorators.js';

// import the boc library and inject your current version of React and ReactDOMServer
const boc = require('boc')(React, ReactDOMServer);

// a useful logger, use whatever one you prefer
var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: "core"
    ,streams: [{ level: 'debug', stream: process.stdout }]
});

// the only mandatory config elements are server and parameters
var config = {
    server: {
        "port": 80,
        "ssl": {
            "enable": false,
            "port": 443,
            "ca": null, // add file paths if you're gonna use SSL
            "key": null,
            "cert": null
        }
    },
    // chuck in other stuff here like database init config params
    parameters: {
    	// put all your app-specific stuff in here, it's all accessible from your statelets
    }
};

// convenient way of organizing statelets
// these are your core server-side entry points - the only mandatory statelet is "boot", as it's the default entry point
// basically, just add a file for each statelet, and the filename becomes the statelet name
let statelets = {};
fs.readdirSync("./src/statelets").forEach(function(file) {
    statelets[file.replace(".js", "")] = require(`./statelets/${file}`);
});


// sets up a temporary DB
const Sequelize = require('sequelize');
const sequelize = new Sequelize({
    database: ':memory:'
    ,username: 'username'
    ,password: null
    ,dialect: 'sqlite'
    ,logging: false
});

// import the specs for each table
var db = {};
fs.readdirSync("./src/db").forEach(function(file) {
    var model = sequelize.import("../src/db/" + file);
    db[model.name] = model;
});

// runs through all the associations, creating foreign keys
Object.keys(db).reduce(function(acc, modelName) {
    var model = db[modelName];
    if("associate" in model) {
        return acc.concat([model]);
    }
    return acc;
}, []).forEach(function(model) {
    model.associate.apply(model, [db]);
});

async function init_db() { // creates some fixtures for the demo
    await sequelize.sync({ force: true });

    var alice = await db.user.create(Object.assign({ username: "alice" }, db.user.genPasswordSync("password123")));
    var sarah = await db.user.create(Object.assign({ username: "sarah" }, db.user.genPasswordSync("password")));
    var jane = await db.user.create(Object.assign({ username: "jane" }, db.user.genPasswordSync("password")));

    var general = await db.forum.create({ name: "General" });
    var qa = await db.forum.create({ name: "Q&A" });
    var complaints = await db.forum.create({ name: "Complaints" });
    var rand = await db.forum.create({ name: "Random" });

    var t1 = await db.thread.create({ topic: "What's the deal with forums?", forum_id: general.id });
    var t2 = await db.thread.create({ topic: "Great forum ideas", forum_id: general.id });
    var t3 = await db.thread.create({ topic: "Avoiding 'first' posts", forum_id: general.id });
    var t4 = await db.thread.create({ topic: "How do I post?", forum_id: qa.id });
    var t5 = await db.thread.create({ topic: "Web forums vs. ancient Roman forums: discuss", forum_id: rand.id });

    var current_time = 1000000;
    await db.post.create({ user_id: alice.id, thread_id: t1.id, microseconds: current_time, text: "Why even bother making forums?" });
    await db.post.create({ user_id: sarah.id, thread_id: t1.id, microseconds: (current_time + 1000), text: "Dunno" });
    await db.post.create({ user_id: jane.id, thread_id: t1.id, microseconds: (current_time + 2000), text: "Bump, here from a google search, need answer ASAP. I can make one fine, that's all good, but I really need a reason to." });

    //var users = await db.user.findAll();
    //console.log(users.map(function(item) { return item.get('public'); }));
    //var users = await db.forum.findAll();
    //console.log(users.map(function(item) { return item.get('public'); }));

}
init_db(); // this will execute in parallel with the server startup - fine for a demo, don't do this in production

boc.RunServer({
    config: config
    ,orm: sequelize						// if you're using sequelize, this is the sequelize object
    ,db: db				        		// if you're using sequelize, this is the object with the table specs
    ,logger: logger						// needs to implement .info(), .debug(), .error() and .trace()
    ,app: App							// the react element that forms the parent of your entire site
    ,actions: actions					// list of actions the server supports
    ,decorators: decorators				// decoration functions that take raw server data and add useful circular references and other un-json-stringify-able things

    ,base_dir: (process.cwd() + "/")
    ,base_html: "src/base.html"
    ,web_dir: "web"
    ,statelets: statelets
    ,html_pre_process: function(html) {		// useful function for mutating the base HTML string before it gets stored for all future requests - will only run once on server startup
        if((process.argv.length >= 3) && (process.argv[2] === "dev")) {
            return html.replace("vendor.js", "vendor_dev.js").replace("bundle.js", "bundle_dev.js");
        }
        return html;
    }
});