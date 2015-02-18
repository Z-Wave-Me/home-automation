/* System: Loaded Cors Handler */
'use strict';
; (function () {
    var NotFound = function (request) {
        var result = null,
            defaultResponse;

        if (request.method === 'OPTIONS') {
            defaultResponse = Core.Namespace('Handlers.Endpoint').getDefaultResponse();
            result = _.extend(defaultResponse, {
                status: 404,
                body: {
                    data: null,
                    message: '404 Not Found',
                    error: null,
                    code: 404
                }
            });
        }

        return result;
    };

    Core.Namespace('Handlers.NotFound', NotFound);
}());