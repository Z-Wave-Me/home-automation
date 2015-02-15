/* System: Loaded Cors Handler */
'use strict';
; (function () {
    var Cors = function (defaultResponse) {
        return _.extend(defaultResponse, {
            body: ''
        });
    };

    Core.Namespace('Handlers.Cors', Cors);
}());