
# BocJS

BocJS is a unified NodeJS framework for both web server and client. It relies on ReactJS.

Version 1.0.0 will be released when documentation and an initialization script is completed. This is a work in progress.

---

The core idea behind BocJS is that both the server and client of a website are one app. Writing client-side code with no knowledge of the server's API is impossible, and writing a server API without consideration for how it will be consumed on the client side is pointless. Rather than separating the two, this framework extends the monolith from server to client and allows you to write as much common code as possible.

The true conceptual gulf is between data retrieval and presentation. Each server call will execute a dynamic tree of dependencies based on the request, and output the correct data. That data then gets bundled and sent off to the client for rendering.

##### Refreshable single page app
Create a web app that allows pure, instant client-side navigation, but still handles page refreshes and back/forward navigation correctly. Only make server calls when you need more data or have to modify it. The rest of the time, the user can click around like they are using a desktop app.

#### Automatic hydration of templates
Any server calls that modify data will then automatically refresh every usage of it, saving you the trouble of writing glue that listens to changes. It doesn't matter what caused the data to change - the usage is decoupled from the processes that create and edit it.

##### Server-side rendering
Define the functionality of your site via React components that are executed on both the server side and client side. The data consumed by the components on both server and client is identical, so your static HTML will reflect actual data, allowing the user to see a fully-formed site before javascript finishes loading.

##### No more REST
Rather than creating endless boilerplate RESTful endpoints for every single operation, simply define actions that can be called by the client. These modify the state your components consume, and can make server calls or stay purely client side.

Often one user action needs to do multiple tasks that span multiple entities - shoehorning normal workflow into pure CRUD endpoints doesn't always make sense. Do all your work in one server call, and return whatever data needs to be modified.

##### Modular data assembly
If you segment your back-end structure along the same fault lines as your data, your server side code can end up a lot more modular and reusable. Define statelets that output particular datasets, then call them whenever you need that data sent to the client.

## Installation

Navigate to an empty directory. Install the initializer with:
```bash
npm install boc
```
Then choose if you want to seed your project with "minimal", "minimal-sass" or "example". The recommendation is "minimal-sass" for new projects, "example" to learn BocJS, or "base" to start with most of what you need for a new project.
```bash
boc-init minimal-sass
npm install
webpack
npm run dev-watch
```
That last command will start the server, and restart it when changes to the code are detected. You should now be able to access the app on localhost.

## Usage

During development, you can either run:
```bash
npm run dev-watch
```
Or in three different command line shells:
```bash
webpack --watch
npm run dev
npm run sass-watch
```
These will watch for code changes and compile your javascript, your sass (if you're using it), and run/restart your server.

Go to localhost in your browser when the server is running and in the console, type:
```
g_InitialData
```
This is the data structure that gets filled with your data and defined automatically on page load. It's also the same one that gets 'decorated' (more on that later), so it's helpful to have a look at it when debugging.

The various components of BocJS will be explained below using examples from the 'example' project - the one copied over for you if you chose to use 'boc-init example'. This is a simple forum webapp.

### Overview

The entry point is the key-value list of actions. This gets passed into the server on initialization, and defines the URL's and endpoints of your app.

```js
var actions = {
    "thread": { url: "/thread/:thread_id/:page", defaults: { page: null }, server: true, post: true }
    ,"forum": { url: "/:forum_name/:page", defaults: { page: null }, server: true, post: true, entry: "boot" }
    ,"home_page": { url: "/" }
};
```
Above, you can see that the name of the last action is the key "home_page", and it defines the root URL. When the user requests a page, the server iterates through the actions until it finds a match, and then launches the associated statelet. In this case, no entry point is defined, so it defaults to "boot".

The server then asynchronously loads the boot statelet. Here's an example:
```js
// boot.js
module.exports = {
    dependencies: ["user", "forum"]
    ,process: async function(builder, db, route, user, forum) {
        builder.output({ static_params: {
            default_page_size: 10
        }});
    }
};
```

A statelet consists of an object with two keys: a list of dependencies (in this case, "user" and "forum") and a process function. The process function is where you do whatever the server needs to do, and output your data.

The dependencies refer to other statelets, which get executed before process runs and the results injected into the function as arguments. Statelets don't actually need to return anything - the work is mainly done by the ```builder.output(key, value)``` function, which sends data to the client. Those other statelets called by boot can and will output their own data using the same mechanism.

Once the entry point statelet is resolved, and all data has been output, the data decoration begins. Decoration is the process of modifying the data blobs so they can be easily used by the render components. Usages include caching calculated values, creating references between related objects, or providing back-references from child to parent objects (thus creating cyclic data structures). The data sent from server to client is undecorated (it is JSON stringified before decoration), so don't worry about sending too much data, as it exists only temporarily in memory. This process is also repeated on the client side with the exact same data, so make sure your decoration functions are runnable in the browser too.

Here is a typical decorator:
```js
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
```
The inputs are ```forum``` and  ```threads```, which are data blobs output by the statelets. Here, although they are separate data items, we link them via the decorator. This way, if you have access to the thread, you have access to the forum and vice versa.

The final step is to use this data in a render component. You must provide a single root component to the server on startup - this then becomes the entry point for all rendering of state.

```js
const React = require('react');
const CreateComponent = require('boc/component')(React);

import Forum from './forum.jsx';
import Thread from './thread.jsx';

export default CreateComponent({ user : "user", route: "route", forums: "forum_list" }, {
    renderForum(item) {
        // ...
    }
    ,render() {

        var page = null;
        if(this.props.route.name === "forum") {
            page = <Forum store={ this.props.store }/>;
        } else if(this.props.route.name === "thread") {
            page = <Thread store={ this.props.store } />;
        } else {
            page = (
                <div>
                    <h1>Example</h1>
                    { this.props.forums.map(this.renderForum) }
                </div>
            );
        }

        return (
            <div id="app-container">
                { page }
            </div>
        );
    }
});


```
Here, this one component acts like a switch for directing rendering to the correct component. The switching is done by route name matching, thus creating the behaviour of showing different pages when you navigate to different URL's. Up top, the ``CreateComponent`` function takes a key-value mapping of data blobs to component props. The keys define the prop keys, and the values define what data blob to hook up. So in this example, a data blob "forum_list" was output by one of the statelets, and then it was decorated. You then have access to it in any component than needs it, not just the top level component.

The final aspect of the system that completes the loop is calling actions. Within a component's event handlers (never the render function!), you can call ``this.action``. For example:
```js
this.action("thread", { thread_id: "abc-123" });
```
Since the action ``thread`` has been defined above with ``server: true``, a server call will be made with this route name and data. The boot statelet will execute, and "thread_id" will be available. It is then the statelet's job to respond correctly, doing access/security checks, and then output the correct data. The decorators will then run and all components that have subscribed to that data will update.

### Actions

Actions are a key-value object of objects that specify the endpoints of your app.
```js
var actions = {
    action_one: {}
    ,action_two: { url: "/", server: true, post: true, entry: "statelet_name" }
    ,action_three: { server: true, post: true }
};
```
###### url ``optional [string]``
Setting a URL on an action allows it to trigger on a GET request with a matching url pattern. To parameterize all or part of the url string, add ``:`` in front of the segment string, and whatever the user sends within that segment gets added as a route parameter. URL's are matched in the order provided, and the first one that matches will trigger that action.
```js
    // will not have thing_id entry in route params
    // ensure this is earlier, to ensure "all" goes to this action and not the next one
    ,action_all: { url: "/home/look-at/all" }

    // if given "/home/look-at/123", route params will have { thing_id: "123" }
    // "/home/look-at/all" will not end up in this action
    ,action_specific: { url: "/home/look-at/:thing_id" }
```
Not specifying a URL means it can only be accessed via a POST request. Note that currently this framework does not allow DELETE, PUT or any other types of HTTP requests, and there are no plans to support it. Any action can delete, update, create or do whatever it wants on the serverside - just try and keep the action name meaningful.

###### defaults ``optional [object]``
Use this in conjunction with a URL value, and you want various url segments to have default values when the URL would otherwise not match. For example:
```js
    // given a URL of "/things/123", this will pass route params of { project_id: "123", thing_id: null }
    // given a URL of "/things/123/abc", this will pass route params of { project_id: "123", thing_id: "abc" }
    // a URL of "/things" will not match, because project_id has no default
    ,action_name: { url: "/things/:project_id/:thing_id", defaults: { thing_id: null } }
```

###### server ``optional [boolean | string array]``
If set to true, this action will always make a server call. If given an array, it will only trigger a server call when that specific parameter changes.
```js
    ,action_client_only: { url: "/smerg" }
    ,action_always_server: { url: "/blah", server: true }

    // server will be called when the thing_id part of the URL changes
    ,action_sometimes_server: { url: "/blah/:project_id/:thing_id", server: ["thing_id"] }
```

###### post ``optional [boolean]``
Set this to true when you want an action with a URL to be called as a simple POST request without navigation.

###### entry ``optional [string]``
The name of the statelet the server call should start in. Any data output by previous calls will persist in client-side memory, so pushing all data every time is not necessary. This allows you to target a specific statelet to update only the data you need.

###### store ``optional [function]``

This function takes action parameters and returns a key-value object of items you want stored as cookies.
```js
    // sets the selected_project_id cookie, and makes a server call
    ,change_project: { server: true, store: function(input) {
        return { selected_project_id: input.project_id };
    }}
```
This is a useful pattern for when you want some persistent variables that can also be accessed on the server side.

###### upload ``optional [string]``
If you want this action to accept uploaded files, this string will become the key in the route params that contains the files uploaded.

###### file ``optional [MIME type string]``
If this action is the direct endpoint of a file you can view or download, this string is the MIME type send to the client in the headers.

### Statelets
Statelets are passed into the server initialization as a key-value object of objects. How you do this is up to you, but the recommendation is to have each statelet live in it's own file, like so:
```js
// thing.js
module.exports = {
    dependencies: ["user", "project"]
    ,process: async function(builder, db, route, project) {

        if(!project.is_alright) {
            return;
        }

        var things = await db.things.findAll();

        builder.output("things", things.map(function(item) {
            return item.get('public');
        }));
    }
};
```
Each statelet has two mandatory values:
###### dependencies [array]
An array of statelet names. If you were to define statelets like so:
```js
const statelets = {
    statelet_one: {
        dependencies: []
        ,process: async function(builder, db, route) {
            // do something...
            return { ok: true, hi: "there" };
        }
    }
    ,statelet_two: {
        dependencies: ["statelet_one"]
        ,process: async function(builder, db, route, statelet_one) {
            // the value of statelet_one should be { ok: true, hi: "there" }
            // do something...
        }
    }
    ,statelet_three: {
        dependencies: ["statelet_one", "statelet_two"]
        ,process: async function(builder, db, route, statelet_one, statelet_two) {
            // do something...
        }
    }
};
```
Then entering a server call at statelet_three (like with `` action_name: { entry: "statelet_three" }`` in actions) would execute "statelet_one" first, then "statelet_two", then "statelet_three" last. This is because of the dependencies list. If you want more dynamic dependency behaviour, you can leave that list empty and call other statelets dynamically inside the process function.
###### process [function]
This is where the server does all the work. Here, you create database entities, make external API calls, delete entities, read files, build empires, etc. Split up the server code into logical modular blocks and give each one a statelet - then they can call each other when needed. The process function takes three mandatory arguments: ``builder``, ``db`` and ``route``. Each dependency then gets added to the list of arguments. ``builder`` is the serverside state builder, and has lots of useful utility functions. ``db`` is whatever ORM you passed into the server init -  the example projects uses Sequelize. ``route`` is an object that contains parameters about the server call, and should be used to make decisions about what to execute. A typical ``route`` looks like:
```js
// route =
{
    name: 'action_name',
    params: {
        some_client_side_data: 123
    },
    page: 'action_name_of_current_page',
    files: { action_upload_string: [] } // optional, only exists when upload is defined
}
```

### Serverside State Builder
TODO

### Components
TODO

### Clientside Store
TODO

### Decorators
TODO

## License

BocJS is open source under the MIT Licence. 

[Read the license here](./LICENSE)