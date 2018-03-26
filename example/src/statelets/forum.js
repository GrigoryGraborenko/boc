/**
 * Created by Grigory on 24/03/2018.
 */

const sequelize = require('sequelize');

module.exports = {
    dependencies: ["user"]
    ,process: async function(builder, db, route, user) {

        var public_item = function(item) {
            return item.get('public');
        };

        var result = {};
        if(route.name === "forum") {
            let page = (route.params.page === null) ? 0 : parseInt(route.params.page);
            let page_size = 10;

            let forum = await db.forum.findOne({ where: sequelize.where(sequelize.fn('lower', sequelize.col('name')), route.params.forum_name.toLowerCase())});
            if(forum) {
                let threads = await db.thread.findAll({ where: { forum_id: forum.id }, limit: page_size, offset: (page_size * page)});
                result.forum = forum.get('public');
                result.threads = threads.map(public_item);
            }
        } else if(route.name === "thread") {
            let page = (route.params.page === null) ? 0 : parseInt(route.params.page);
            let page_size = 10;

            let thread = await db.thread.findOne({ where: { id: route.params.thread_id }});
            if(thread) {
                let posts = await db.post.findAll({ where: { thread_id: thread.id }, limit: page_size, offset: (page_size * page)});
                result.thread = thread.get('public');
                result.posts = posts.map(public_item);
            }
        }

        var forums = await db.forum.findAll();
        result.forum_list = forums.map(public_item);
        return result;
    }
};