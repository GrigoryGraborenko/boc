/**
 * Created by Grigory on 18/03/2018.
 */

const React = require('react');
const CreateComponent = require('boc/component')(React);

import Navigation from './navigation.jsx';

export default CreateComponent({ user : "user" }, {
    render() {

        var page = <h1>Example</h1>;

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
