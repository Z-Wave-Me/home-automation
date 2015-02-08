/* Initialized Core/Namespace */
'use strict';
; (function () {
    if (typeof global.Automation !== 'object') {
        global.Automation = {};
    }
    /**
     * Namespace function.
     * @exports Core/Namespace
     */

    var Core = global.Core,
        /**
         * @name namespaceFunc
         * @namespace Core/Namespace
         * @param {string} name - name path for namespace
         * @param {*} [value] - value
         * @returns {*}
         */
        namespaceFunc = function (name, value) {
            var space = global.Automation,
                parts = name.split('.');

            for (var i = 0, len = parts.length; i < len; i += 1) {
                if (space[parts[i]] === undefined && value === undefined) {
                    return undefined;
                } else if (value !== undefined) {
                    space[parts[i]] = (len - 1) === i ? value : {};
                }

                space = space[parts[i]];
            }

            return space;
        };

    namespaceFunc.get = namespaceFunc;
    namespaceFunc.set = namespaceFunc;

    Core.Namespace = namespaceFunc;
}());