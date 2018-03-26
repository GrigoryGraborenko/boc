/**
 * Created by Grigory on 25/03/2018.
 */

const React = require('react');
const CreateComponent = require('boc/component')(React);
import actions from '../actions.js';

export default CreateComponent({ _pending: "_pending" }, {
    handleClick(action_name, evnt) {
        var input = {};
        for(var key in this.props) {
            if((key === "children") || (key === "store") || (key === "name") || (key === "className") || (key === "_pending")) {
                continue;
            }
            input[key] = this.props[key];
        }
        this.props.store.action(action_name, input);
        evnt.preventDefault();
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
        if(action.url !== undefined) {
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
