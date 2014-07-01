define([
    'backbone'
], function (Backbone) {
    "use strict";

    return function (method, model, options) {
        //log('-- SYNC --');
        //log(JSON.stringify(options));
        //log(model.toJSON());

        var methodMap = { 'create': 'POST', 'update': 'PUT', 'delete': 'DELETE', 'read': 'GET' },
            type = methodMap[method],
            params,
            getValue;

        function urlError() {
            log("!!! URL NOT SET!");
        }

        getValue = function (object, prop) {
            if (!(object && object[prop])) {
                return;
            }
            return _.isFunction(object[prop]) ? object[prop]() : object[prop];
        };

        // Default options, unless specified.
        options = options || {};

        // Default JSON-request options.
        params = {type: type, dataType: 'json'};

        // Ensure that we have a URL.
        if (!options.url) {
            params.url = getValue(model, 'url') || urlError();
        }

        // Ensure that we have the appropriate request data.
        if (!options.data && model && (method === 'create' || method === 'update')) {
            params.contentType = 'application/json';
            params.data = stringify(model.toJSON());
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
    };
});
