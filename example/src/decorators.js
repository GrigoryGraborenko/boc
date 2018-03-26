/**
 * Created by Grigory on 18/03/2018.
 */

const decorators = [
    {
        input: ["forum", "threads"]
        ,output: function(forum, threads) {

            if((!forum) || (!threads)) {
                return;
            }
            threads.forEach(function(thread) {
                if(thread.forum_id === forum.id) {
                    thread.forum = forum;
                    forum.forum_threads.push(thread);
                }
            });
        }
    }
    // yes, these two decorators are identical in structure and probably should be refactored, but the goal of this example is clarity not elegance
    // the above comment is needlessly defensive
    ,{
        input: ["thread", "posts"]
        ,output: function(thread, posts) {
            if((!thread) || (!posts)) {
                return;
            }
            posts.forEach(function(post) {
                if(post.thread_id === thread.id) {
                    post.thread = thread;
                    thread.thread_posts.push(post);
                }
            });
        }
    }
];

export default decorators;