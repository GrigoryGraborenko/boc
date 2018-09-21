////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const React = require('react');
const CreateComponent = require('boc/component')(React, require('create-react-class'));

import Action from './action.jsx';

export default CreateComponent({ user : "user", route: "route", pending: "_pending" }, {
    getInitialState() {
        return { };
    }
    ,renderMenuRoute(menu_route, index) {

        if(!menu_route.label) {
            return <div key={ index } className="spacer"></div>;
        }
        if(!menu_route.action) {
            return <div key={ index } >{ menu_route.label }</div>;
        }
        var is_active = this.props.route.name === menu_route.action;
        var class_name = "pointer" + (is_active ? " bold italics" : "");
        if(menu_route.className) {
            class_name += " " + menu_route.className;
        }

        return (
            <div key={ index } className={ class_name }>
                <Action store={ this.props.store } name={ menu_route.action } linkless={ true } >
                    { menu_route.label }
                </Action>
            </div>
        );
    }
    ,render() {

        var menu_routes = [
            { action: "home_page", label: "Home" }
            ,{}
        ];

        if(this.props.user) {
            menu_routes.push({ label: ("Logged in as " + this.props.user.username) });
            menu_routes.push({ action: "logout", label: "Logout" });
        } else {
            menu_routes.push({ action: "login_page", label: "Login" });
        }

        return (
            <div id="navbar-container">
                <div id="navbar">
                    <div id="navbar-logo">
                        <Action store={ this.props.store } name="home_page" linkless={ true } className="pointer">
                            <img src="/img/example.png" />
                        </Action>
                    </div>
                    { menu_routes.map(this.renderMenuRoute) }
                </div>
            </div>
        );
    }
});