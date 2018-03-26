/**
 * Created by Grigory on 18-Mar-18.
 */

const ClientInit = require("boc/client");
const React = require('react');
const ReactDOM = require('react-dom');

import App from './components/app.jsx';
import actions from './actions.js';
import decorators from './decorators.js';

// inject your root react element, html element id for your root node, your actions and decorators, and boc does the rest
window.onload = () => {
    ClientInit(React, ReactDOM, App, 'container', actions, decorators);
};