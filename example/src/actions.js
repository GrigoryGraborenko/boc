////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var actions = {
    login_page: { url: "/login" }
    ,login: { server: true }
    ,logout: { server: true }

    ,post_thread: { server: true, post: true, entry: "forum" }
    ,post_reply: { server: true, post: true, entry: "forum" }

    ,thread: { url: "/thread/:thread_id", server: true, post: true }
    ,forum: { url: "/:forum_name/:page", defaults: { page: null }, server: true, post: true }
    ,home_page: { url: "/" }
};

export default actions;