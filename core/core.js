/* Start Core */
'use strict';
; (function () {
    /**
     * Extend function.
     * @exports Core/Core
     */
    var Core = function (options) {
        var self = this;

        self._components = ['Helpers', 'Namespace', 'Storage', 'Base', 'Model', 'Router', 'Collection'];

        if (global._ === undefined) {
            throw new Error('Underscore is not available');
        }

        // Set structure
        _.extend(self, self._components.reduce(function (memo, value) {
            memo[value] = {};
            return memo;
        }, {}));

        // Initializing Core
        self.initialize(options);

        return self;
    };

    Core.prototype = {
        initialize: function (options) {
            var self = this;
            self.options = options || {};
        }
    };

    global.Core = new Core({
        defaultLang: 'en'
    });

    // Loading sub-core components
    if (global.executeFile !== undefined) {
        global.Core._components.forEach(function (componentName) {
            executeFile('core/core.' + componentName.toLowerCase() + '.js');
        });
    }
}());