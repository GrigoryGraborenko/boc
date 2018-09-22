////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const React = require('react');
const CreateComponent = require('boc/component')(React, require('create-react-class'));
import Action from './action.jsx';
import moment from 'moment';

// if you were to make a real forum, you'd probably have a core entity that's a recursive tree structure, and just render the levels differently
// forum, threads and posts would all be nodes in a tree, and it would be a totally sweet, compact code base
export default CreateComponent({ user: "user", thread: "thread", pending: "_pending" }, {
    getInitialState() {
        return { new_post: null };
    }
    ,handleNewPost() {
        this.setState({ new_post: "" });
    }
    ,handlePostChange(evnt) {
        this.setState({ new_post: evnt.target.value });
    }
    ,handlePost() {
        this.setState({ new_post: null });
        this.action("post_reply", { thread_id: this.props.thread.id, text: this.state.new_post });
    }
    ,handlePostCancel() {
        this.setState({ new_post: null });
    }
    ,renderPost(post) {
        return (
            <div key={ post.id } className="forum-post">
                <div>{ post.text }</div>
                <small>{ post.user.username } - { moment.unix(post.seconds).format("H:mm:ss DD-MM-YYYY") }</small>
            </div>
        );
    }
    ,render() {

        if(this.props.pending.thread) {
            return <div>Loading...</div>;
        }

        if(!this.props.thread) {
            return <div>Cannot find thread</div>;
        }

        if(this.props.pending.post_reply) {
            var new_post = <div>Posting...</div>;
        } else if((this.state.new_post !== null) && this.props.user) {
            var new_post = (
                <div>
                    <textarea className="form-control" placeholder="Reply..." value={ this.state.new_post } onChange={ this.handlePostChange }/>
                    <button className="btn btn-success" onClick={ this.handlePost } >Submit</button>
                    <button className="btn btn-danger" onClick={ this.handlePostCancel } >Cancel</button>
                </div>
            );
        } else if(this.props.user) {
            var new_post = <button className="btn btn-primary" onClick={ this.handleNewPost } >Reply</button>;
        }

        return (
            <div>
                <Action store={ this.props.store } name="forum" forum_name={ this.props.thread.forum.name } >
                    <span>&larr; Back</span>
                </Action>
                <h2>{ this.props.thread.topic }</h2>
                { this.props.thread.thread_posts.map(this.renderPost) }
                { new_post }
            </div>
        );
    }
});