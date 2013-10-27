define([
    'backbone'
], function (Backbone) {
    "use strict";

    var toParam = function(obj, prefix) {
        log(">>>>>>>>>>> " + prefix + ": " + JSON.stringify(obj));
        var out = [], prop, val;

        if (!prefix) {
            prefix = "";
        }

        for (prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                val = obj[prop];
                if (val) {
                    if (Array.isArray(val)) {
                        // TODO ignoring by now
                    } else if (typeof val === "function") {
                        // do nothing
                    } else if (typeof val === "object") {
                        var res = toParam(val, prefix + prop + ".");
                        if (res) {
                            out.push(res);
                        }
                    } else {
                        out.push(prefix + "" + prop + "=" + obj[prop]);
                    }
                }
            }
        }

        log("= " + out.join('&'));
        return out.join('&');
    };

    return function(method, model, options) {
        log('<- SYNC ->');
        log(JSON.stringify(options));

        function urlError() {
            log("!!! URL NOT SET!");
        }

        var getValue = function (object, prop) {
            if (!(object && object[prop])) return null;
            return _.isFunction(object[prop]) ? object[prop]() : object[prop];
        };

        //var methodMap = { 'create': 'POST', 'update': 'PUT', 'delete': 'DELETE', 'read': 'GET' };
        var methodMap = { 'create': 'GET', 'update': 'GET', 'delete': 'GET', 'read': 'GET' };
        var type = methodMap[method];

        // Default options, unless specified.
        options || (options = {});

        // Default JSON-request options.
        var params = {type: type, dataType: 'json'};

        // Ensure that we have a URL.
        if (!options.url) {
            params.url = getValue(model, 'url') || urlError();
        }

        /*
         if (method == 'delete')
         params.url += '/delete';
         */

        // Ensure that we have the appropriate request data.
        if (!options.data && model && (method == 'create' || method == 'update')) {
            // params.contentType = 'application/json';
//            params.data = $.param(model.toJSON());
            params.data = toParam(model.toJSON());
        }

        // For older servers, emulate JSON by encoding the request into an HTML-form.
        if (Backbone.emulateJSON) {
            params.contentType = 'application/x-www-form-urlencoded';
            params.data = params.data ? {model: params.data} : {};
        }

        // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
        // And an `X-HTTP-Method-Override` header.
        if (Backbone.emulateHTTP) {
            if (type === 'PUT' || type === 'DELETE') {
                if (Backbone.emulateJSON) params.data._method = type;
                params.type = 'POST';
                params.beforeSend = function (xhr) {
                    xhr.setRequestHeader('X-HTTP-Method-Override', type);
                };
            }
        }

        // Don't process data on a non-GET request.
        if (params.type !== 'GET' && !Backbone.emulateJSON) {
            params.processData = false;
        }

        // Make the request, allowing the user to override any Ajax options.
        return $.ajax(_.extend(params, options));

    }
});
