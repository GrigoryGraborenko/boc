/**
 * Created by Grigory on 20/02/2017.
 */
'use strict';

var Store = function(actions, decorators) {

    var m_Api = {};
    var m_Data = null;
    var m_IsClient = null;
    var m_Callbacks = {};

    ///////////////////////////////////
    function decorateData(keys) {

        function keysContain(input) {
            return keys.some(function(key) {
                return (key === input);
            });
        }

        decorators.forEach(function(decorator) {
            var activate = decorator.input.some(keysContain);
            if(activate) {
                var result = decorator.output.apply(null, decorator.input.map(function(key) { return m_Data[key]; }));
                if(!result) {
                    return;
                }
                for(let key in result) {
                    if(!keysContain(key)) {
                        keys.unshift(key);
                    }
                    m_Data[key] = result[key];
                }
            }
        });
        return keys;
    }

    ///////////////////////////////////
    function modifyData(data) {

        for(var key in data) {
            m_Data[key] = data[key];
        }
        var key_set = decorateData(Object.keys(data));

        key_set.forEach(function(key) {

            var callbacks = m_Callbacks[key];
            if (callbacks !== undefined) {
                /// callbacks can modify the callbacks array, so best to null invalid ones and clean them up after
                for (var i = 0; i < callbacks.length; i++) {
                    var call = callbacks[i];
                    if (call !== null) {
                        call(m_Data[key]);
                    }
                }
                m_Callbacks[key] = callbacks.filter(function (call) {
                    return (call !== null);
                });
            }
        });
    }

    ///////////////////////////////////
    function serverAction(action, key, params, callback, url) {

        if(!url) {
            url = "/" + key;
        }

        var request = new XMLHttpRequest();
        request.open("POST", url);

        if(!action.upload) {
            request.setRequestHeader("Content-type", "application/json");
        }


        var change = {};
        change[key] = m_Data._pending[key] ? (m_Data._pending[key] + 1) : 1;
        change = { _pending: Object.assign({}, m_Data._pending, change) };
        //var change = { _pending: Object.assign({}, m_Data._pending, { [key]: ( m_Data._pending[key] ? (m_Data._pending[key] + 1) : 1 ) }) };
        if(m_Data._errors[key] !== undefined) {
            var new_errors = Object.assign({}, m_Data._errors);
            delete new_errors[key];
            change._errors = new_errors;
        }
        modifyData(change);

        request.onreadystatechange = function() {
            if(request.readyState !== 4) {
                return;
            }
            var new_pending = Object.assign({}, m_Data._pending);
            new_pending[key]--;
            if(new_pending[key] <= 0) {
                delete new_pending[key];
            }

            if(request.status === 200) {
                var data = JSON.parse(request.responseText);
                data._pending = new_pending;
                modifyData(data);
                if(callback) {
                    callback(true, data);
                }
            //} else if((request.status >= 301) && (request.status <= 308)) {
            //    console.log(request);
            } else {
                try {
                    var data = JSON.parse(request.response);
                } catch(e) {
                    var data = { error: "Server Error" };
                }
                var error_change = {};
                error_change[key] = data.error;
                modifyData({ _errors: Object.assign({}, m_Data._errors, error_change), _pending: new_pending });
                if(callback) {
                    callback(false, data);
                }
            }
        };

        var current_page = m_Api.processURL(document.location.pathname);
        var json_payload = { page: current_page };
        if(action.upload) {
            json_payload.data = Object.assign({},  params);

            var form_data = new FormData();

            (Array.isArray(action.upload) ? action.upload : [action.upload]).forEach(function(file_key) {
                var files = params[file_key];
                for(var f = 0; f < files.length; f++) {
                    form_data.append(file_key + "___" + f, files[f]);
                }
                delete json_payload.data[file_key];
            });

            form_data.append("input", JSON.stringify(json_payload));
            request.send(form_data);
        } else {
            json_payload.data = params;
            request.send(JSON.stringify(json_payload));
        }
    }

    /////////////////////////////////// returns action name and params
    m_Api.processURL = function(url) {
        var parts = url.split("/").filter(function(part) { return part !== "" });
        for(var name in actions) {
            var action = actions[name];
            var action_url = action.url;
            if(action_url === undefined) {
                action_url = name;
            }
            var test_parts = action_url.split("/").filter(function(part) { return part !== "" });
            if(test_parts.length < parts.length) {
                continue;
            }
            var params = {};
            var match = test_parts.every(function(test, index) {
                if(test.indexOf(":") === 0) {
                    var val_name = test.replace(":", "");
                    if(index >= parts.length) {
                        if((action.defaults === undefined) || (action.defaults[val_name] === undefined)) {
                            return false;
                        }
                        params[val_name] = action.defaults[val_name];
                    } else {
                        params[val_name] = parts[index];
                    }
                    return true;
                } else if(index >= parts.length) {
                    return false;
                }
                return (test === parts[index]);
            });
            if(match) {
                var route = { name: name, params: params };
                if(action.entry) {
                    route.entry = action.entry;
                }
                if(action.file) {
                    route.file = action.file;
                }
                if(action.upload) {
                    route.post = true;
                }
                if(action.post) {
                    route.post = action.post;
                }
                return route;
            }
        }
        return null;
    };

    ///////////////////////////////////
    m_Api.generateURL = function(action, input) {

        if(typeof action === "string") {
            action = actions[action];
        }

        var url_parts = action.url.split("/").filter(function(part) { return part !== "" });
        url_parts = url_parts.map(function(part) {

            if(part.indexOf(":") === 0) {
                var name = part.replace(":", "");
                var value = input[name];
                if((value !== undefined) && (value !== null)) {
                    return value;
                }
                if(action.defaults && (action.defaults[name] !== undefined)) {
                    return null;
                }
                return undefined;
            }
            return part;
        }).filter(function(part) { return part !== null });

        if(url_parts.some(function(part) { return part === undefined; })) {
            return null;
        }
        return ("/" + url_parts.join("/"));
    };

    ///////////////////////////////////
    m_Api.setInitialData = function(data, is_client) {
        if(m_Data !== null) {
            return;
        }
        m_IsClient = is_client;
        m_Data = data;
        m_Data._pending = { };
        m_Data._errors = { };

        if(m_IsClient) {

            document.cookie.split(';').forEach(function(cookie) {
                var parts = cookie.trim().split('=');
                if(parts.length === 2) {
                    m_Data[decodeURI(parts[0])] = decodeURI(parts[1]);
                }
            });

            /*
            try { // safari mobile private browsing does not support sessionStorage
                sessionStorage.setItem("storage_test", ".");
                sessionStorage.removeItem("storage_test");
                storage = sessionStorage;
            } catch(err) {
                storage = {};
                storage.setItem = function(key, value) {
                    if((key === "setItem") || (key === "getItem")) {
                        return;
                    }
                    storage[key] = value;
                };
                storage.getItem = function(key) {
                    return storage[key];
                };
            }

            for(var session_key in storage) {
                m_Data[session_key] = storage.getItem(session_key);
            }
            */
        }

        decorateData(Object.keys(m_Data));

        if(m_IsClient) {

            var expected_url = m_Api.generateURL(m_Data.route.name, m_Data.route.params);
            if((expected_url !== null) && (expected_url !== document.location.pathname)) {
                window.history.replaceState({}, "", expected_url);
            }

            window.onpopstate = function(evnt) {
                var route = m_Api.processURL(document.location.pathname);
                internalAction(route.name, route.params, true);
                modifyData({ route: route });
            };
        }
    };

    ///////////////////////////////////
    m_Api.get = function(key) {
        var data = m_Data[key];
        if(data === undefined) {
            return null;
        }
        return data;
    };

    ///////////////////////////////////
    m_Api.subscribe = function(key, callback) {
        if(m_Callbacks[key] === undefined) {
            m_Callbacks[key] = [];
        }
        m_Callbacks[key].push(callback);
    };
    ///////////////////////////////////
    m_Api.unsubscribe = function(key, callback) {
        if(m_Callbacks[key] === undefined) {
            return;
        }
        /// callbacks can modify the callbacks array, so best to null invalid ones and clean them up after
        for(var i = 0; i < m_Callbacks[key].length; i++) {
            if(m_Callbacks[key][i] === callback) {
                m_Callbacks[key][i] = null;
            }
        }
    };
    ///////////////////////////////////
    m_Api.broadcast = function(key, data) {
        if(m_Callbacks[key] === undefined) {
            return;
        }
        for(var i = 0; i < m_Callbacks[key].length; i++) {
            m_Callbacks[key][i](data);
        }
    };

    ///////////////////////////////////
    m_Api.actionFile = function(action_name, input, callback) {
        var action = actions[action_name];
        if((action === undefined) || (action.file === undefined)) {
            console.error("ACTION not found or invalid: " + action_name);
            return;
        }
        if(input === undefined) {
            input = {};
        }
        var url = m_Api.generateURL(action, input);

        if(callback) {
            var request = new XMLHttpRequest();
            request.open("GET", url);
            request.responseType = "arraybuffer";
            request.setRequestHeader("Content-type", "application/octet-stream");

            request.onreadystatechange = function() {
                if(request.readyState !== 4) {
                    return;
                }
                if(request.status === 200) {
                    callback(null, request.response);
                } else {
                    callback(request.statusText);
                }
            };

            var current_page = m_Api.processURL(document.location.pathname);
            request.send(JSON.stringify({ data: input, page: current_page }));
        } else {

            var downloadFrame = document.createElement("iframe");
            downloadFrame.setAttribute('src', url);
            downloadFrame.setAttribute('class', "invisible-element");
            document.body.appendChild(downloadFrame);
            window.setTimeout(function() {
                document.body.removeChild(downloadFrame);
            }, 10000);
        }
    };

    ///////////////////////////////////
    function internalAction(action_name, input, suppress_route, callback) {
        var action = actions[action_name];
        if(action === undefined) {
            console.error("ACTION not found: " + action_name);
            return;
        }
        if(input === undefined) {
            input = {};
        }
        if(!m_IsClient) {
            return;
        }

        // if action.server is a list
        if(Array.isArray(action.server)) {
            var server_action = action.server.some(function(trigger) {
                //return ((input[trigger] !== m_Data.route.params[trigger]) || (input[trigger] === undefined));
                return (input[trigger] !== m_Data.route.params[trigger]);
            });
        } else {
            var server_action = action.server === true;
        }

        if((action.url !== undefined) && (suppress_route !== true)) {
            var url = m_Api.generateURL(action, input);
            if(url !== null) {
                window.history.pushState({}, "", url);
                if (action.defaults !== undefined) {
                    input = Object.assign({}, action.defaults, input);
                }
                modifyData({route: {name: action_name, params: input}});
            }
        }
        if(action.store !== undefined) {
            var store_output = action.store(input);
            for(var key in store_output) {
                if(typeof store_output[key] === "string") {
                    document.cookie = key + "=" + store_output[key] + ";path=/";
                    //storage.setItem(key, store_output[key]);
                }
            }
            modifyData(store_output);
        }
        if(server_action) {
            serverAction(action, action_name, input, callback, url);
        } else if(callback) {
            window.setTimeout(function() {
                callback(true);
            });
        }
    }

    ///////////////////////////////////
    m_Api.action = function(action_name, input, callback) {
        internalAction(action_name, input, undefined, callback);
    };

    return m_Api;
};

module.exports = Store;