////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const React = require('react');
const CreateComponent = require('boc/component')(React, require('create-react-class'));

import Action from './action.jsx';
import Navigation from './navigation.jsx';
import Forum from './forum.jsx';
import Thread from './thread.jsx';
import Login from './login.jsx';

export default CreateComponent({ user : "user", route: "route", forums: "forum_list" }, {
    renderForum(item) {
        return (
            <div key={ item.id } >
                <Action store={ this.props.store } name="forum" forum_name={ item.name.toLowerCase() } >
                    <b>{ item.name }</b>
                </Action>
            </div>
        );
    }
    ,render() {

        var page = null;
        if(this.props.route.name === "forum") {
            page = <Forum store={ this.props.store }/>;
        } else if(this.props.route.name === "thread") {
            page = <Thread store={ this.props.store } />;
        } else if(this.props.route.name === "login_page") {
            page = <Login store={ this.props.store } />;
        } else if(this.props.route.name === "about") {
            page = (
                <div>
                    This is an example of a bare-bones forum.
                </div>
            );
        } else {
            page = (
                <div>
                    <h1>Example</h1>
                    { this.props.forums.map(this.renderForum) }
                </div>
            );
        }

        return (
            <div id="app-container">
                <Navigation store={this.props.store} />
                <div id="page-container" >
                    { page }
                </div>
            </div>
        );
    }
});
