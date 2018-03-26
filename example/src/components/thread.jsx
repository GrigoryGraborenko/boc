/**
 * Created by Grigory on 26/03/2018.
 */

const React = require('react');
const CreateComponent = require('boc/component')(React);
import Action from './action.jsx';

// if you were to make a real forum, you'd probably have a core entity that's a recursive tree structure, and just render the levels differently
// forum, threads and posts would all be nodes in a tree, and it would be a totally sweet, compact code base
export default CreateComponent({ thread: "thread", pending: "_pending" }, {
    renderPost(post) {
        return (
            <div key={ post.id } >
                <p>{ post.text }</p>
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

        return (
            <div>
                <h2>{ this.props.thread.topic }</h2>
                { this.props.thread.thread_posts.map(this.renderPost) }
            </div>
        );
    }
});