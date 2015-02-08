/* Initialized Core/Helpers */
'use strict';
; (function () {
    /**
     * Helpers.
     * @exports Core/Helpers
     */
    var Core = global.Core;
    _.extend(Core.Helpers, {
        /**
         * The easy way extend classes
         * @method
         * @exports Core/Helpers
         * @returns {object}
         */
        Extend: function () {
            var SuperClass = arguments.length === 1 ? this : arguments[1],
                NewClass = arguments.length === 1 ? arguments[0] : arguments[1],
                HelpClass = function () {
                    SuperClass.apply(this, Array.prototype.slice.call(arguments));
                };

            Object.defineProperty(HelpClass, "__super__", {
                value: SuperClass.prototype,
                enumerable: false,
                writable: false,
                configurable: false
            });

            HelpClass.prototype = Object.create(SuperClass.prototype, {
                constructor: {
                    value: HelpClass,
                    enumerable: false,
                    writable: true,
                    configurable: true
                }
            });

            // copy property superclass and newclass
            _.extend(HelpClass.prototype, SuperClass, NewClass);

            HelpClass.Extend = Core.Helpers.Extend;

            return HelpClass;
        },
        getType: function (value) {
            var result;

            if (_.isString(value)) {
                result = 'string';
            } else if (_.isArray(value)) {
                result = 'array';
            } else if (_.isObject(value)) {
                result = 'object';
            } else if (_.isFunction(value)) {
                result = 'function';
            } else if (_.isBoolean(value)) {
                result = 'boolean';
            } else if (_.isNumber(value)) {
                result = 'number';
            }

            return result;
        }
    });
}());