////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const React = require('react');
const CreateComponent = require('boc/component')(React, require('create-react-class'));
import Action from './action.jsx';

export default CreateComponent({ user : "user", pending: "_pending", errors: "_errors" }, {
    getInitialState() {
        return { username: "", password: "" };
    }
    ,handleUsername(evnt) {
        this.setState({ username: evnt.target.value });
    }
    ,handlePassword(evnt) {
        this.setState({ password: evnt.target.value });
    }
    ,handleReset() {
        this.setState({ password: "" });
    }
    ,render() {

        if(this.props.user) {
            return (
                <div className="container">
                    <h3>Already logged in</h3>
                </div>
            );
        }

        return (
            <div className="container">
                <div>
                    <h3>Login</h3>
                    <div>
                        <label>Username</label>
                        <input className="form-control" type="text" placeholder="Enter username..." value={this.state.username} onChange={this.handleUsername} />
                    </div>
                    <div>
                        <label>Password</label>
                        <input className="form-control" type="password" placeholder="Enter password..." value={this.state.password} onChange={this.handlePassword} />
                    </div>
                    <div><b>{ this.props.errors.login }</b></div>
                    <div>
                        <Action store={this.props.store} name="login" username={ this.state.username } password={ this.state.password } onFail={ this.handleReset } >
                            <button className="btn btn-default" disabled={this.props.pending.login} >{ this.props.pending.login ? "Working..." : "Login" }</button>
                        </Action>
                    </div>
                </div>
            </div>
        );
    }
})