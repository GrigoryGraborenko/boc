/**
 * Created by Grigory on 20/03/2018.
 */

import moment from "moment"

const crypto = require('crypto');
const sequelize = require('sequelize');
const util = require('util');
const randomBytes_ASYNC = util.promisify(crypto.randomBytes);

module.exports = {
    dependencies: []
    ,process: async function(builder, db, route) {

        let session = null;
        if(route.name === "login") {
            var user = await db.user.findOne({where: sequelize.where(sequelize.fn('lower', sequelize.col('username')), route.params.email.toLowerCase()) });
            if(user === null) {
                /// TODO: add delay of a second here
                throw "Invalid credentials";
            }
            if((user.password === null) || (user.salt === null)) {
                throw "Password not set";
            }
            let key = await db.user.testPassword(route.params.password, user.salt);
            let pass_str = key.toString("hex");
            if(pass_str !== user.password) {
                throw "Invalid credentials";
            }

            // keep session if logging in multiple times, reset the expiry
            if((user.session !== null) && (moment(user.session_valid_until).isSameOrAfter(moment()))) {
                session = user.session;
            } else {
                var bytes = await randomBytes_ASYNC(256);
                session = bytes.toString("hex");
            }

            await user.update({ session: session, session_valid_until: moment().add(1, "days") });
            builder.outputCookie("session", session);

            builder.output("user", user.get("selfPublic"));
            return { user: user };
        }

        session = builder.getCookie("session");
        if(session === undefined) {
            builder.output("user", null);
            return { user: null };
        }

        var user = await (db.user.findOne({ where: { session: session, session_valid_until: { $gte: moment()}}}));
        if(user === null) {
            builder.output("user", null);
            return { user: null };
        }

        if(route.name === "logout") {
            await user.update({ session: null, session_valid_until: null });
            builder.outputCookie("session", "");
            return { public: null, user: null };
        } else if(route.name === "change_password") {
            let pass_str = await db.user.testPassword(route.params.old_pass, user.salt);
            if(pass_str !== user.password) {
                throw "old password is invalid";
            }
            let new_pass = await db.user.genPassword(route.params.new_pass);
            await user.update(new_pass);
            builder.log("info", "User " + user.email + " changed password");
            return { user: user.get("selfPublic") };
        }

        builder.output("user", user.get("selfPublic"));
        return { user: user };
    }
};