/**
 * Created by Grigory on 20/02/2017.
 */
'use strict';

module.exports = function(React) {

    return function(connections, component_spec) {
        component_spec.action = function(name, input, callback) {
            this.props.store.action(name, input, callback);
        };

        var component = React.createClass(component_spec);
        return React.createClass({
            getInitialState: function() {

                if(this.props.store === undefined) {
                    throw "Component needs store";
                }

                var state = { _subscriptions: {} };
                for(var key in connections) {
                    state[key] = this.props.store.get(connections[key]);
                }
                return state;
            }
            ,componentWillMount: function() {
                var subscriptions = {};
                var this_ref = this;
                Object.keys(connections).forEach(function(key) {
                    var func = function(callback_val) {
                        var new_state = {};
                        new_state[key] = callback_val;
                        this_ref.setState(new_state);
                    };
                    this.props.store.subscribe(connections[key], func);
                    subscriptions[connections[key]] = func;
                }, this);
                this.setState({ _subscriptions : subscriptions });
            }
            ,componentWillUnmount: function() {
                for(var key in this.state._subscriptions) {
                    this.props.store.unsubscribe(key, this.state._subscriptions[key]);
                }
                this.setState({ _subscriptions : {} });
            }
            ,render: function () {
                if(this.props.store === undefined) {
                    return null;
                }
                var params = Object.assign({}, this.props, this.state);
                delete params["_subscriptions"];
                return React.createElement(component, params);
            }
        });
    };
};