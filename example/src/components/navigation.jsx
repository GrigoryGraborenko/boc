/**
 * Created by Grigory on 20-Mar-18.
 */

const React = require('react');
const CreateComponent = require('boc/component')(React);

export default CreateComponent({ user : "user", route: "route", pending: "_pending" }, {
    getInitialState() {
        return { };
    }
    ,render() {
    	return null;
    }
});