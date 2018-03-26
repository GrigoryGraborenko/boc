/**
 * Created by Grigory on 20/03/2018.
 */

module.exports = {
    dependencies: ["user", "forum"]
    ,process: async function(builder, db, route, user, forum) {

        return {
            user: user.public
            ,forum_list: forum.forum_list
            ,forum: forum.forum
            ,threads: forum.threads
            ,thread: forum.thread
            ,posts: forum.posts
        };
    }
};