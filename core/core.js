/* Initialized Core */
'use strict';
; (function () {
    /**
     * Extend function.
     * @exports Core/Core
     */
    var Core = function (options) {
        var self = this;

        self._components = ['Namespace', 'Storage', 'Helpers', 'Base', 'Model', 'Collection', 'Module'];

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

    Core.prototype = {};

    Core.prototype.initialize = function (options) {
        var self = this;
        self.options = options || {};

    };

    global.Core = new Core({
        defaultLang: 'en'
    });

    // Loading sub-core components
    if (global.executeFile !== undefined) {
        executeFile('core/core.helpers.js');
        executeFile('core/core.namespace.js');
        executeFile('core/core.storage.js');
        executeFile('core/core.base.js');
        executeFile('core/core.model.js');
        executeFile('core/core.collection.js');
    }
}());