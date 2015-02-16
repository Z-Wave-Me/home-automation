/* System: Loaded Rest Handler */
'use strict';
; (function () {
    var Rest = function Rest (url, request) {
        var self = this,
            response = null;

        if (request.method === 'OPTIONS') {
            response = Core.Namespace('Handlers.Cors').call(self, Rest._getDefaultResponse());
        }

        return response;
    };

    Rest._getDefaultResponse = function () {
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
                message: null
            }
        });

        if (globalConfig.remoting.cors.origin) {
            defaultResponse.headers['Access-Control-Allow-Origin'] = '*';
        }

        return defaultResponse;
    };

    Core.Namespace('Handlers.Rest', Rest);
}());