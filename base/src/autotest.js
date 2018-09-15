
const fs = require('fs');
const Sequelize = require('sequelize');

const puppeteer = require('puppeteer');

import { GetTime, InitFixtures, LoadFixtures } from './utils';

////////////////////////////////////////////////////////////////////////////////
export async function RunTests(regular_config, dev_sequelize, logger, InitDB, InitServer) {

    logger.info("Initializing tests...");

    var db_query = await dev_sequelize.query("SELECT datname FROM pg_database;");
    var database_names = db_query[0].map(function(item) { return item.datname; });

    const db_prefix = "INSERT DB NAME_test_db_";
    const db_usage = db_prefix + "usage";
    const clean_db = false;

    var { fixtures, reset_query } = await InitFixtures();

    let test_sets = {};
    fs.readdirSync("./src/tests").forEach(function(file) {
        test_sets[file.replace(".js", "")] = require(`./tests/${file}`);
    });

    if(clean_db && (database_names.indexOf(db_usage) !== -1)) {
        await dev_sequelize.query(`DROP DATABASE ${db_usage};`);
    }
    if(clean_db || (database_names.indexOf(db_usage) === -1)) {
        await dev_sequelize.query(`CREATE DATABASE ${db_usage};`);
    }

    var [sequelize, db] = InitDB(db_usage);
    await sequelize.sync({ force: true});

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
            await sequelize.query(reset_query);
            let cache = await LoadFixtures(db, fixtures, regular_config.parameters.fixtures.seed);
            let fixtures_time = GetTime();

            /// browser preserves caches and cookies across new pages
            let browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--proxy-server="direct://"',
                    '--proxy-bypass-list=*'
                ]
            });
            let browser_time = GetTime();

            try {
                await test.test(db, browser, root_url, cache);
            } catch(err) {

                process.stdout.write("E\n");
                logger.error(`Error in ${test_set_name}/${test_name}:`);
                logger.error(err);
            }
            let test_time = GetTime();
            await browser.close();
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