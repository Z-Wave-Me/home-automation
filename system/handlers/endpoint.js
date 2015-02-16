/* System: Loaded Rest Handler */
'use strict';
; (function () {
    var Endpoint = function Endpoint (url, request) {
        var self = this,
            response = null,
            handlers = Core.Namespace('Handlers'),
            order = ['Unavailable', 'Cors', 'Rest'], // order running
            i = 0;

        while (i < order.length) {
            response = handlers[order[i]].call(self, request);
            if (response !== null) {
                break;
            }
            i += 1;
        }

        return response;
    };

    Endpoint.getDefaultResponse = function () {
        var defaultResponse = {},
            currentDate = new Date(),
            globalConfig = global.App.config;

        _.extend(defaultResponse, {
            status: 200,
            headers: {
                'Date': currentDate.toString(),
                'Access-Control-Allow-Credentials': globalConfig.remoting.cors.credentials,
                'Access-Control-Allow-Methods': globalConfig.remoting.allowMethods.join(', '),
                'Access-Control-Allow-Headers': globalConfig.remoting.allowHeaders.join(', '),
                'Content-Type': 'application/json',
                'Content-Language': globalConfig.defaultLanguage,
                'X-API-VERSION': globalConfig.version
            },
            body: {
                error: null,
                data: null,
                code: 200,
                message: '200 OK'
            }
        });

        if (globalConfig.remoting.cors.origin) {
            defaultResponse.headers['Access-Control-Allow-Origin'] = '*';
        }

        return defaultResponse;
    };

    Core.Namespace('Handlers.Endpoint', Endpoint);
}());