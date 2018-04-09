/**
 * Created by Grigory on 22/02/2017.
 */
'use strict';

const CreateStatelet = require("./base_statelet");

var StateBuilder = function(params, sequelize, db, logger, decorators, statelets, request, route, response) {

    var m_Api = {};
    var m_StateletPromises = {};
    var m_Statelets = {};
    var m_Cookies = {};
    var m_OutputHeaders = {};
    var m_OutputCookies = {};
    var m_OutputFile = null;
    var m_ManualResponse = false;

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
    m_Api.getAllCookies = function() {
        return Object.assign({}, m_Cookies, m_OutputCookies);
    };
    m_Api.transaction = async function() {
        return await sequelize.transaction();
    };
    m_Api.log = function(level, msg, extra) {
        if(extra) {
            logger[level](msg, extra);
        } else {
            logger[level](msg);
        }
    };
    m_Api.outputCookie = function(name, value) {
        m_OutputCookies[name] = value;
    };
    m_Api.outputToFile = function(data, filename) {
        if(m_OutputFile === null) {
            m_OutputFile = data;
            if(filename) {
                m_OutputHeaders["Content-Disposition"] = "attachment; filename=\"" + filename + "\"";
            }
        } else {
            m_OutputFile = Buffer.concat([m_OutputFile, data]);
        }
    };
    m_Api.outputHeader = function(header, data) {
        m_OutputHeaders[header] = data;
    };
    m_Api.manualResponse = function(status, headers, body) {
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
            for(let key in result) {
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

    m_Api.getAllOutputHeaders = function(base) {
        var output = Object.assign({}, base, m_OutputHeaders);

        var cookie_list = [];
        for(let name in m_OutputCookies) {
            cookie_list.push(name + "=" + m_OutputCookies[name]);
        }
        if(cookie_list.length > 0) {
            let restrictions = "; SameSite=Strict; HttpOnly;";
            if(params.server.ssl.enable) {
                restrictions += " Secure;";
            }
            output['Set-Cookie'] = cookie_list.join(";") + restrictions;
        }
        return output;
    };
    m_Api.getFileOutput = function() {
        return m_OutputFile;
    };

    return m_Api;
};

module.exports = StateBuilder;