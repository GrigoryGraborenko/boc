/**
 * Created by Grigory on 20/03/2018.
 */

module.exports = {
    dependencies: ["user", "forum"]
    ,process: async function(builder, db, route, user, forum) {

        /// At this point, you could access whatever was returned by the user statelet, including the original user
        /// object before it was sanitized for the client side. Have a look at console.log(user)

        /// boot doesn't need to return anything and neither do any of the statelets. They do all their work with
        /// builder.output("key", value);
        /// or
        /// builder.output({ key: value, other_key: other_value });

        builder.output({ static_params: {
            default_page_size: 10
        }});
    }
};