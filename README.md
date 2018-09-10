
# BocJS

BocJS is a unified NodeJS framework for both web server and client. It relies on ReactJS.

Version 1.0.0 will be released when documentation and an initialization script is completed. This is a work in progress.

## Overview

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
npm run dev-watch
```
That last command will start the server, and restart it when changes to the code are detected. You should now be able to access the app on localhost.

## Usage


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