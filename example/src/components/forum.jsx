////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const React = require('react');
const CreateComponent = require('boc/component')(React, require('create-react-class'));
import Action from './action.jsx';

export default CreateComponent({ user: "user", forum : "forum", threads: "threads", pending: "_pending" }, {
    getInitialState() {
        return { new_thread: null, initial_post: "" };
    }
    ,handleNewPost() {
        this.setState({ new_thread: "", initial_post: "" });
    }
    ,handleThreadChange(evnt) {
        this.setState({ new_thread: evnt.target.value });
    }
    ,handlePostChange(evnt) {
        this.setState({ initial_post: evnt.target.value });
    }
    ,handlePost() {
        this.action("post_thread", { forum_id: this.props.forum.id, new_thread: this.state.new_thread, initial_post: this.state.initial_post });
    }
    ,handlePostCancel() {
        this.setState({ new_thread: null, initial_post: "" });
    }
    ,renderThread(thread) {
        return (
            <div key={ thread.id } >
                <Action store={ this.props.store } name="thread" thread_id={ thread.id } >
                    <b>{ thread.topic }</b>
                </Action>
            </div>
        );
    }
    ,render() {

        if(this.props.pending.forum) {
            return <div>Loading...</div>;
        }

        if(!this.props.forum) {
            return <div>Cannot find forum</div>;
        }

        if(this.props.pending.post_thread) {
            var new_thread = <div>Posting...</div>;
        } else if(this.state.new_thread !== null) {
            var new_thread = (
                <div>
                    <div>
                        <span>Subject:
                            <input className="form-control" value={ this.state.new_thread } onChange={ this.handleThreadChange }/>
                        </span>
                    </div>
                    <div>
                        <span>Post:
                            <textarea className="form-control" rows="5" value={ this.state.initial_post } onChange={ this.handlePostChange }/>
                        </span>
                    </div>
                    <button className="btn btn-success" onClick={ this.handlePost }>Post</button>
                    <button className="btn btn-warning" onClick={ this.handlePostCancel }>Cancel</button>
                </div>
            );
        } else if(this.props.user) {
            var new_thread = <button className="btn btn-primary" onClick={ this.handleNewPost }>New thread</button>;
        }

        return (
            <div>
                <Action store={ this.props.store } name="home_page">
                    <span>&larr; Back</span>
                </Action>
                <h2>{ this.props.forum.name }</h2>
                { this.props.forum.forum_threads.map(this.renderThread) }
                { new_thread }
            </div>
        );
    }
});