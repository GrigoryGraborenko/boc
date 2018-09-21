////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const sequelize = require('sequelize');

import { GetTime } from "../utils";

module.exports = {
    dependencies: ["user"]
    ,process: async function(builder, db, route, user) {

        var public_item = function(item) {
            return item.get('public');
        };

        if((route.name === "post_thread") && user.user) {

            let forum = await db.forum.findOne({ where: { id: route.params.forum_id } });
            if(!forum) {
                throw "Could not find forum";
            }
            let transaction = await builder.transaction();
            let thread = await db.thread.create({ forum_id: forum.id, topic: route.params.new_thread }, { transaction: transaction });
            let post = await db.post.create({ user_id: user.user.id, thread_id: thread.id, text: route.params.initial_post, seconds: GetTime() });
            await transaction.commit();

            builder.output({ thread: thread.get('public'), posts: [post.get("public")] });
            builder.redirect("thread", { thread_id: thread.id });

        } else if((route.name === "post_reply") && user.user) {

            var thread = await db.thread.findOne({ where: { id: route.params.thread_id } });
            if(!thread) {
                throw "Could not find thread";
            }
            await db.post.create({ user_id: user.user.id, thread_id: thread.id, text: route.params.text, seconds: GetTime() });
            // note how the thread var is created - the natural flow of threads and posts are allowed to proceed, but now the new post is in there

        } else if(route.name === "forum") {
            let page_size = 10;
            let page = (route.params.page === null) ? 0 : parseInt(route.params.page);
            let forum = await db.forum.findOne({ where: sequelize.where(sequelize.fn('lower', sequelize.col('name')), route.params.forum_name.toLowerCase())});
            if(forum) {
                let threads = await db.thread.findAll({ where: { forum_id: forum.id }, limit: page_size, offset: (page_size * page)});
                builder.output({ forum: forum.get('public'), threads: threads.map(public_item) });
            }

        } else if(route.name === "thread") {
            var thread = await db.thread.findOne({ where: { id: route.params.thread_id }});
        }

        if(thread) {
            let posts = await db.post.findAll({ where: { thread_id: thread.id }, order: [["seconds", "ASC"]]});
            builder.output({ thread: thread.get('public'), posts: posts.map(public_item) });
        }

        var forums = await db.forum.findAll();
        builder.output("forum_list", forums.map(public_item));
    }
};