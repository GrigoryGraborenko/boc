/**
 * Created by Grigory on 18-Mar-18.
 */

const ClientInit = require("boc/client");
const React = require('react');
const ReactDOM = require('react-dom');

import App from './components/app.jsx';
import actions from './actions.js';
import decorators from './decorators.js';

window.onload = () => {
    ClientInit(React, ReactDOM, App, 'container', actions, decorators);
};