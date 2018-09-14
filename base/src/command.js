
import fs from 'fs';
import Sequelize from 'sequelize';
import moment from 'moment';

module.exports = async function(sequelize, db, logger, args, config) {

    var call = args[0];
    var params = args.slice(1);
    const danger_string = "!danger";

    switch(call) {
        case "schema:load":
            await sequelize.sync({ force: true });
        case "migrations:latest":
        case "migrations:up":
        case "migrations:down":

            let model_name = '_migrations';
            let model_definition = { id: { type: Sequelize.STRING(128), primaryKey: true } };
            let model_options = { createdAt: false, updatedAt: false };
            let model = sequelize.define(model_name, model_definition, model_options);

            let q_interface = sequelize.getQueryInterface();
            let tables = await q_interface.showAllTables();
            if(tables.indexOf(model_name) < 0) {
                await q_interface.createTable(model_name, model_definition, model_options);
            }

            let path = "./migrations";
            let migration_files = [];
            fs.readdirSync(path).forEach(function(file) {
                var stats = fs.statSync(path + '/' + file);
                if(!stats.isDirectory()) {
                    migration_files.push(file.split(".")[0]);
                }
            });
            migration_files = migration_files.sort(function(a, b) {
                return a.localeCompare(b);
            });

            if(call === "schema:load") {
                for(let m = 0; m < migration_files.length; m++) {
                    try {
                        await model.create({ id: migration_files[m] });
                    } catch(err) {
                        break;
                    }
                }
                return "Hard synced database";
            }

            let existing_migrations = await model.findAll({ order: [["id", "DESC"]] });

            let transaction = await sequelize.transaction();

            if(call !== "migrations:down") {
                existing_migrations = existing_migrations.map(function(existing) { return existing.id; });
                for(let m = 0; m < migration_files.length; m++) {
                    let migration_file = migration_files[m];
                    if(existing_migrations.indexOf(migration_file) < 0) {
                        logger.info("Executing migration " + migration_file + "...");
                        let file = require("../migrations/" + migration_file);
                        await file.up(q_interface, sequelize, transaction);
                        await model.create({id: migration_file}, { transaction: transaction });
                        if(call === "migrations:up") {
                            break;
                        }
                    }
                }
            } else if(existing_migrations.length > 0) {
                let migration = existing_migrations[0].id;
                logger.info("Reverting migration " + migration + "...");
                let file = require("../migrations/" + migration);
                await file.down(q_interface, sequelize, transaction);
                await existing_migrations[0].destroy();
            } else {
                logger.info("No more migrations to revert");
            }

            await transaction.commit();

            return "Complete";
        case "migrations:create":
            let data = "'use strict';\n\nconst Sequelize = require('sequelize');\n\nmodule.exports = {\n    up: async function (query_interface, sequelize, transaction) {\n    }\n    ,down: async function (query_interface, sequelize, transaction) {\n    }\n};"
            fs.writeFileSync("./migrations/" + moment().unix() + ".js", data);
            return "Complete";
        case "schema:sync":
            await sequelize.sync();
            return "Synced database";
        case "user:create":
            if(params.length < 4) {
                throw "Needs email, access level, first name and last name";
            }
            await db.user.create({
                email: params[0]
                ,role: params[1]
                // ,given_names: params[2]
                // ,last_name: params[3]
            });
            return "Created user";

        case "user:password:set":
            if(params.length < 2) {
                throw "Needs two parameters - email and password";
            }
            var user = await db.user.findOne({ where: { email: params[0] }});
            if(user === null) {
                throw "Cannot find user";
            }

            await user.update(db.user.genPasswordSync(params[1]));

            return "Set password";

        case "user:password:check":
            if(params.length < 2) {
                throw "Needs two parameters - email and password";
            }
            var user = await db.user.findOne({ where: { email: params[0] }});
            if(user === null) {
                throw "Cannot find user";
            }
            if((user.password === null) || (user.salt === null)) {
                throw "Password not set";
            }

            var pass_str = db.user.testPasswordSync(params[1], user.salt);

            if(pass_str === user.password) {
                return "+++ Password matches";
            } else {
                throw "--- Password does not match";
            }
        default:
            throw "Unknown command";
    }
};