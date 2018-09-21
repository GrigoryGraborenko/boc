////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const React = require('react');
const CreateComponent = require('boc/component')(React, require('create-react-class'));
import actions from '../actions.js';

export default CreateComponent({ _pending: "_pending" }, {
    handleClick(action_name, evnt) {
        const exclude = ["key", "children", "store", "name", "className", "onSuccess", "onFail", "_pending", "linkless", "onClick"];
        var input = {};
        for(var key in this.props) {
            if(exclude.indexOf(key) !== -1) {
                continue;
            }
            input[key] = this.props[key];
        }
        var this_ref = this;
        this.props.store.action(action_name, input, function(success) {
            if(success && this_ref.props.onSuccess) {
                this_ref.props.onSuccess();
            } else if((!success) && this_ref.props.onFail) {
                this_ref.props.onFail();
            }
        });
        evnt.preventDefault();
        evnt.stopPropagation();
        evnt.nativeEvent.preventDefault();
        evnt.nativeEvent.stopPropagation();
        if(this.props.onClick) {
            this.props.onClick();
        }
    }
    ,render() {

        if(this.props.store === undefined) {
            return null;
        }

        var action = actions[this.props.name];
        if(action === undefined) {
            console.log("Error - invalid action: " + this.props.name);
            return null;
        }
        var class_name = this.props.className ? this.props.className : "";
        if((action.url !== undefined) && (this.props.linkless !== true)) {
            var url = this.props.store.generateURL(action, this.props);
            if(url !== null) {
                return <a href={url} className={ class_name } onClick={this.handleClick.bind(this, this.props.name)}>{this.props.children}</a>;
            } else {
                return <a className={ class_name } >{this.props.children}</a>;
            }
        }
        return <span className={ class_name } onClick={this.handleClick.bind(this, this.props.name)}>{this.props.children}</span>;
    }
});
