
const fs = require('fs');
const crypto = require('crypto');
const Sequelize = require('sequelize');

const puppeteer = require('puppeteer');

import { GetTime } from './utils';
//import { GetTime, Delay } from './utils'; /// TODO: remove "delay"

////////////////////////////////////////////////////////////////////////////////
async function CreateConnection(db_name, db_config) {

    var sequelize = new Sequelize(db_name, db_config.username, db_config.password, {
        host: db_config.host
        ,dialect: db_config.type
        ,pool: { idle: 20000 }
        ,define: {
            createdAt: 'created_at'
            ,updatedAt: 'updated_at'
        }
    });

    var db = {};
    fs.readdirSync("./db").forEach(function(file) {
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

}

////////////////////////////////////////////////////////////////////////////////
async function LoadFixtures(db, fixtures) {

    // password is 'password' - insert a calculated value
    var cache = {
        password: ""
        ,salt: ""
        ,session_admin: "admin_session_token"
        ,session_client: "client_session_token"
    };
    for(let f = 0; f < fixtures.fixtures.length; f++) {

        let fixture = fixtures.fixtures[f];

        if(Array.isArray(fixture.objects)) {
            for(let i = 0; i < fixture.objects.length; i++) {
                let obj_spec = fixture.objects[i];
                let obj = Object.assign({}, obj_spec);
                for(let key in obj_spec) {
                    if(cache[obj_spec[key]] !== undefined) {
                        obj[key] = cache[obj_spec[key]];
                    }
                }
                await db[fixture.table].create(obj);
            }
            continue;
        }
        for(let id in fixture.objects) {
            let obj_spec = fixture.objects[id];
            let obj = Object.assign({}, obj_spec);
            for(let key in obj_spec) {
                if(cache[obj_spec[key]] !== undefined) {
                    obj[key] = cache[obj_spec[key]];
                }
            }
            cache[id] = (await db[fixture.table].create(obj)).id;
        }
    }
    return cache;
}

////////////////////////////////////////////////////////////////////////////////
export async function RunTests(dev_sequelize, logger, InitDB, InitServer) {

    logger.info("Initializing tests...");

    var db_query = await dev_sequelize.query("SELECT datname FROM pg_database;");
    var database_names = db_query[0].map(function(item) { return item.datname; });

    const db_prefix = "INSERT_NAME_test_db_";
    const db_usage = db_prefix + "usage";
    const clean_db = false;

    var fixtures_data = fs.readFileSync("./src/test_fixtures.json");
    var fixtures = JSON.parse(fixtures_data + "");

    let test_sets = {};
    fs.readdirSync("./src/tests").forEach(function(file) {
        test_sets[file.replace(".js", "")] = require(`./tests/${file}`);
    });

    /// TODO: reset query needs to hit all tables due to testing creating other items
    var delete_tables = fixtures.fixtures.reduce(function(accum, fixture) {
        var result = accum.slice(0);
        var name = fixture.table_name ? fixture.table_name : fixture.table;
        if(accum.indexOf(name) === -1) {
            result.unshift(name);
        }
        return result;
    }, []);
    var reset_query = delete_tables.map(function(table) {
        return `DELETE FROM ${table};`;
    }).join("");

    if(clean_db && (database_names.indexOf(db_usage) !== -1)) {
        await dev_sequelize.query(`DROP DATABASE ${db_usage};`);
    }
    if(clean_db || (database_names.indexOf(db_usage) === -1)) {
        await dev_sequelize.query(`CREATE DATABASE ${db_usage};`);
    }

    var [sequelize, db] = InitDB(db_usage);
    await sequelize.sync({ force: true});

    //var table_query = await sequelize.query("select table_name from information_schema.tables where table_schema = 'public';");
    //var table_names = table_query[0].map(function(item) { return item.table_name; });

    //await sequelize.query(reset_query);
    //await LoadFixtures(db, fixtures);

    var config = JSON.parse(fs.readFileSync("./config/test.json") + "");
    var port = config.server.port;
    var root_url = `${ config.server.ssl.enable ? "https" : "http" }://localhost:${ port }`;

    var server_logger = {
        trace: function() {}
        ,debug: function() {}
        ,info: function() {}
        ,error: function() {}
    };
    var servers = InitServer(sequelize, db, config, server_logger);
    logger.info("Running tests...");

    var has_only = Object.values(test_sets).some(function(tests) { return tests.some(function(test) { return test.only; }); });

    var total_fixtures_time = 0;
    var total_test_time = 0;
    //var total_browser_time = 0;
    var total_full_time = 0;
    var num_tests_run = 0;
    for(let test_set_name in test_sets) {
        let test_set = test_sets[test_set_name];
        for(let t = 0; t < test_set.length; t++) {
            let test = test_set[t];
            if(test.skip || (has_only && (!test.only))) {
                continue;
            }
            let test_name = test.name || t;

            let start_time = GetTime();
            let cache = null;
            if(!test.unit) {
                await sequelize.query(reset_query);
                cache = await LoadFixtures(db, fixtures);
            }
            let fixtures_time = GetTime();

            let browser = null;
            if(!test.unit) {
                /// browser preserves caches and cookies across new pages
                browser = await puppeteer.launch({
                    headless: true,
                    args: [
                        '--proxy-server="direct://"',
                        '--proxy-bypass-list=*'
                    ]
                });
            }
            let browser_time = GetTime();

            try {
                await test.test(db, browser, root_url, cache);
            } catch(err) {

                process.stdout.write("E\n");
                logger.error(`Error in ${test_set_name}/${test_name}:`);
                logger.error(err);
            }
            let test_time = GetTime();
            if(browser) {
                await browser.close();
            }
            let finish_time = GetTime();

            num_tests_run++;

            total_fixtures_time += fixtures_time - start_time;
            total_test_time += test_time - browser_time;
            total_full_time += finish_time - start_time;
            process.stdout.write(".");
            //logger.info(`TEST ${test_set_name}: ${test_name}: ${fixtures_time - start_time} sec fixtures, ${test_time - browser_time} sec test, ${finish_time - start_time} sec total`);
        }
    }

    process.stdout.write("\n");
    logger.info(`${num_tests_run} tests run, total time was: ${total_full_time.toFixed(3)} seconds total, ${total_fixtures_time.toFixed(3)} seconds for fixtures and ${total_test_time.toFixed(3)} seconds for test bodies`);

    if(clean_db) {
        await sequelize.close();
        await dev_sequelize.query(`DROP DATABASE ${db_usage};`);
    }

    logger.info("Tests complete");
}

/*
////////////////////////////////////////////////////////////////////////////////
export async function RunTests(dev_sequelize, db, logger, db_config) {

    const db_prefix = "field_test_db_";
    const db_usage = db_prefix + "usage";

    var fixtures_data = fs.readFileSync("./src/data/test_fixtures.json");

    var hash = crypto.createHash('sha256');
    hash.update(fixtures_data);
    hash = hash.digest('hex').slice(0, 12);

    var db_query = await dev_sequelize.query("SELECT datname FROM pg_database;");
    var database_names = db_query[0].map(function(item) { return item.datname; });

    const db_name = db_prefix + hash;
    if(database_names.indexOf(db_name) === -1) {
        logger.info(`Creating new fixtures template: ${db_name}`);
        let fixtures = JSON.parse(fixtures_data + "");
        await dev_sequelize.query(`CREATE DATABASE ${db_name};`);
        await dev_sequelize.query(`UPDATE pg_database SET datistemplate=true WHERE datname='${db_name}';`);

        await LoadFixtures(db_name, fixtures);
    } else {
        logger.info(`Using existing fixtures template: ${db_name}`);
    }

    for(let i = 0; i < database_names.length; i++) {
        let name = database_names[i];
        if((name.indexOf(db_prefix) === 0) && (name !== db_name)) {
            logger.info(`Removing old fixtures template: ${name}`);
            await dev_sequelize.query(`UPDATE pg_database SET datistemplate=false WHERE datname='${name}';`);
            await dev_sequelize.query(`DROP DATABASE ${name};`);
        }
    }

    var t0 = GetTime();
    logger.info(`Creating usage DB`);
    await dev_sequelize.query(`CREATE DATABASE ${db_usage} TEMPLATE ${db_name};`);
    //await dev_sequelize.query(`CREATE DATABASE ${db_usage};`);

    await dev_sequelize.query(`DROP DATABASE ${db_usage};`);

    var t1 = GetTime();
    logger.info(`Done in ${t1 - t0} sec`);

    //console.log(tables);

    //var file_obj = { filename: filename, filepath: filepath, extension: ext, cache_control: "public, max-age=2419200" };
    //console.log(hash);

    return "Tests run";
}
*/