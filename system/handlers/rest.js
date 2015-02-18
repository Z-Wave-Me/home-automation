/* System: Loaded Cors Handler */
'use strict';
; (function () {
    var Rest = function (request) {
        var result = null,
            App = global.App,
            router = App.Router,
            defaultResponse = Core.Namespace('Handlers.Endpoint').getDefaultResponse();

        if (router.exists(request)) {
            var execute = router.dispatch(request);
            if (execute && execute.found && !execute.error) {
                if (_.isObject(execute)) {
                    defaultResponse.body.data = execute.data;
                } else if (_.isString(execute)) {
                    defaultResponse.body.data = execute;
                }
                result = defaultResponse;
            } else if (execute && !execute.found && !execute.error) {
                result = Core.Namespace('Handlers.NotFound').call(this, request);
            } else if (execute.error) {
                result = Core.Namespace('Handlers.NotFound').call(this, request);
            }
        }

        return result;
    };

    Core.Namespace('Handlers.Rest', Rest);
}());