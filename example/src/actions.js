/**
 * Created by Grigory on 18/03/2018.
 */

var actions = {
    "login": { server: true }
    ,"logout": { server: true }

    ,"thread": { url: "/thread/:thread_id/:page", defaults: { page: null }, server: true, post: true }
    ,"forum": { url: "/:forum_name/:page", defaults: { page: null }, server: true, post: true }
    ,"home_page": { url: "/" }
};

export default actions;