////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
'use strict';

const CreateStatelet = require("./base_statelet");

var StateBuilder = function(params, sequelize, db, logger, decorators, statelets, request, route, response) {

    var m_Api = {};
    var m_StateletPromises = {};
    var m_Statelets = {};
    var m_Cookies = {};
    var m_OutputData = {};
    var m_OutputHeaders = {};
    var m_OutputCookies = {};
    var m_OutputFile = null;
    var m_ManualResponse = false;
    var m_Redirect = null;

    if(request.headers.cookie !== undefined) {
        request.headers.cookie.split(';').forEach(function (cookie) {
            var parts = cookie.trim().split('=');
            if (parts.length === 2) {
                m_Cookies[decodeURI(parts[0])] = decodeURI(parts[1]);
            }
        });
    }

    m_Api.isGetRequest = function() {
        return (request.method === "GET");
    };
    m_Api.getParam = function(key) {
        return params.parameters[key];
    };
    m_Api.getRequest = function() {
        return request;
    };
    m_Api.getSequelizeInstance = function() {
        return sequelize;
    };
    m_Api.getLogger = function() {
        return logger;
    };
    m_Api.getCookie = function(name) {
        return m_Cookies[name];
    };
    m_Api.getOutputCookies = function() {
        var cookie_vals = {};
        for(var name in m_OutputCookies) {
            cookie_vals[name] = m_OutputCookies[name].value;
        }
        return cookie_vals;
    };
    m_Api.getAllCookies = function() {
        return Object.assign({}, m_Cookies, m_Api.getOutputCookies());
    };
    m_Api.getRedirect = function() {
        return m_Redirect;
    };
    m_Api.redirect = function(action, params) {
        m_Redirect = { name: action, params: (params ? params : {}) };
    };
    m_Api.transaction = async function(input) {
        return await sequelize.transaction(input);
    };
    m_Api.log = function(level, msg, extra) {
        if(extra) {
            logger[level](msg, extra);
        } else {
            logger[level](msg);
        }
    };
    m_Api.output = function(key, value) {
        if(typeof key === "string") {
            m_OutputData[key] = value;
        } else {
            m_OutputData = Object.assign({}, m_OutputData, key);
        }
    };
    m_Api.outputCookie = function(name, value, read_only) {
        m_OutputCookies[name] = { value: value, http: (read_only !== false) };
    };
    m_Api.outputToFile = function(data, filename) {
        if(m_OutputFile === null) {
            m_OutputFile = data;
            if(filename) {
                m_Api.outputHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            }
        } else {
            m_OutputFile = Buffer.concat([m_OutputFile, data]);
        }
    };
    m_Api.setOutputFileName = function(filename) {
        m_Api.outputHeader("Content-Disposition", filename ? ("attachment; filename=\"" + filename + "\"") : null);
    };
    m_Api.outputHeader = function(header, data, allow_multiple) {

        var existing = m_OutputHeaders[header];
        if(existing !== undefined) {
            if(data === null) {
                delete m_OutputHeaders[header];
            } else if((allow_multiple === true) && Array.isArray(existing)) {
                existing.push(data);
            } else if(allow_multiple === true) {
                m_OutputHeaders[header] = [existing, data];
            }
            return;
        }

        m_OutputHeaders[header] = data;
    };
    m_Api.manualResponse = function(status, headers, body) {
        if(status === undefined) {
            m_ManualResponse = true;
            return response;
        }
        response.writeHead(status, headers);
        response.write(body);
        response.end();
        m_ManualResponse = true;
    };
    m_Api.getManualResponse = function() {
        return m_ManualResponse;
    };
    m_Api.decorateData = function(input) {

        var keys = Object.keys(input);
        function keysContain(input) {
            return keys.some(function(key) {
                return (key === input);
            });
        }

        decorators.forEach(function(decorator) {
            var activate = decorator.input.some(keysContain);
            if(!activate) {
                return;
            }
            var result = decorator.output.apply(null, decorator.input.map(function(key) { return input[key]; }));
            if(!result) {
                return;
            }
            for(var key in result) {
                if(!keysContain(key)) {
                    keys.push(key);
                }
                input[key] = result[key];
            }
        });

        return input;
    };

    m_Api.get = function(name) {
        if(m_Statelets[name] === undefined) {
            m_Statelets[name] = CreateStatelet(name, statelets[name]);
        }
        var statelet = m_Statelets[name];
        if(m_StateletPromises[name] !== undefined) {
            return m_StateletPromises[name];
        }
        var promise = statelet.execute(m_Api, db, route);
        m_StateletPromises[name] = promise;
        return promise;
    };
    m_Api.getOutput = function(key) {
        if(key) {
            return m_OutputData[key];
        }
        return m_OutputData;
    };

    m_Api.getAllOutputHeaders = function(base) {
        var output = Object.assign({}, base, m_OutputHeaders);

        var default_restriction = "; SameSite=Strict;";
        if(params.server.ssl.enable) {
            default_restriction += " Secure;";
        }
        var cookie_list = [];
        for(var name in m_OutputCookies) {
            var cookie = m_OutputCookies[name];
            cookie_list.push(name + "=" + cookie.value + default_restriction + (cookie.http ? " HttpOnly" : ""));
        }

        var existing = output['Set-Cookie'];
        if(existing && Array.isArray(existing)) {
            cookie_list = cookie_list.concat(existing);
        } else if(existing) {
            cookie_list.push(existing);
        }
        output['Set-Cookie'] = cookie_list;

        return output;
    };
    m_Api.getFileOutput = function() {
        return m_OutputFile;
    };

    return m_Api;
};

module.exports = StateBuilder;