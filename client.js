/**
 * Created by Grigory on 7/03/2018.
 */
'use strict';

const Store = require('./src/store.js');

module.exports = function(React, ReactDOM, app, container_id, actions, decorators) {

    // find polyfill for IE
    if(!Array.prototype.find) { Object.defineProperty(Array.prototype, 'find', { value: function(predicate) { if(this == null) { throw new TypeError('"this" is null or not defined'); } var o = Object(this); var len = o.length >>> 0; if (typeof predicate !== 'function') { throw new TypeError('predicate must be a function'); } var thisArg = arguments[1]; var k = 0; while (k < len) { var kValue = o[k]; if (predicate.call(thisArg, kValue, k, o)) { return kValue; } k++; } return undefined; }});}
    if(!Array.prototype.findIndex) { Object.defineProperty(Array.prototype, 'findIndex', { value: function(predicate) { if (this == null) { throw new TypeError('"this" is null or not defined'); } var o = Object(this); var len = o.length >>> 0; if (typeof predicate !== 'function') { throw new TypeError('predicate must be a function'); } var thisArg = arguments[1]; var k = 0; while (k < len) { var kValue = o[k]; if (predicate.call(thisArg, kValue, k, o)) { return k; } k++; } return -1; } }); }

    if((!app) || (!container_id) || (!actions) || (!decorators)) {
        throw "Please provide a react component, container id, actions array and decorator array";
    }

    var store = Store(actions, decorators);
    store.setInitialData(g_InitialData, true);
    var element = React.createElement(app, { store: store, client: false });
    ReactDOM.render(element, document.getElementById(container_id));
};