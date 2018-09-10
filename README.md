
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
Then choose if you want to seed your project with "minimal", "minimal-sass" or "example". The recommendation is "minimal-sass" for new projects, or "example" to learn BocJS.
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
    "home_page": { url: "/" }
};
```
Above, you can see that the name of the action is the key "home_page", and it defines the root URL. When the user requests a page, the server iterates through the actions until it finds a match, and then launches the associated statelet. In this case, no entry point is defined, so it defaults to "boot".

The server then asynchronously loads the boot statelet:
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


### Actions


TODO

### Statelets
TODO

### Components
TODO

### Decorators
TODO

## License

BocJS is open source under the MIT Licence. 

[Read the license here](./LICENSE)