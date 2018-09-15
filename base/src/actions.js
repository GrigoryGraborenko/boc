
var actions = {
    login: { server: true }
    ,logout: { server: true }
    ,profile: { url: "/profile" }
    ,change_password: { server: true, entry: "user" }

    ,home_page: { url: "/" }
};

export default actions;