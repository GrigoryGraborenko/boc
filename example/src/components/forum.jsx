/**
 * Created by Grigory on 25/03/2018.
 */

const React = require('react');
const CreateComponent = require('boc/component')(React);
import Action from './action.jsx';

export default CreateComponent({ forum : "forum", threads: "threads", pending: "_pending" }, {
    renderThread(thread) {
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

        return (
            <div>
                <h2>{ this.props.forum.name }</h2>
                { this.props.forum.forum_threads.map(this.renderThread) }
            </div>
        );
    }
});