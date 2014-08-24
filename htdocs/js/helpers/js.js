define([], function () {

    var Helpers = new function() {
        var Helpers = function() {

        };

        Helpers.prototype = {
            constructor: Helpers,
            extend: function(to, from) {
                for (var key in from) {
                    if (from.hasOwnProperty(key)) {
                        to[key] = from[key];
                    }
                }
                return to;
            }
        };

        return Helpers;
    };

    return Helpers;
});