/* System: Loaded Cors Handler */
'use strict';
; (function () {
    var Unavailable = function () {
        var result = null,
            defaultResponse,
            App = global.App;

        if (!App.ready || App.messages.length > 0) {
            defaultResponse = Core.Namespace('Handlers.Endpoint').getDefaultResponse();
            result = _.extend(defaultResponse, {
                status: 503,
                body: {
                    code: 503,
                    data: null,
                    message: '503 Service Unavailable',
                    error: App.messages.length > 0 ? App.messages.join('; ') : null
                }
            });
        }

        return result;
    };

    Core.Namespace('Handlers.Unavailable', Unavailable);
}());