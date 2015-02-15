/* Start Core/Base */
'use strict';
; (function () {
    /**
     * Basic class
     * @constructor
     * @class Base
     */
    var Core = global.Core,
        Base = function (options) {
            this.options = options || {};
            this._init.apply(this, Array.prototype.slice.call(arguments));
        };

    Base.prototype = {
        initialized: false,
        _events: {},
        _init: function () {
            var self = this;

            if (self.initialized) {
                return false;
            }

            self.initialized = true;
            if (typeof self.init === 'function') {
                self.init.apply(self, Array.prototype.slice.call(arguments));
            }
            self.initialize.apply(self, Array.prototype.slice.call(arguments));
        },
        initialize: function () {},
        on: function (topics, callback) {
            var self = this;

            topics.split(' ').forEach(function (topic) {
                if (!self._events.hasOwnProperty(topic)) {
                    self._events[topic] = [];
                }

                self._events[topic].push(callback);
            });
        },
        off: function (topics, callback) {
            var self = this;

            topics.split(' ').forEach(function (topic) {
                if (callback === undefined) {
                    self._events[topic] = [];
                } else {
                    self._events.filter(function (func) {
                        return func !== callback;
                    });
                }
            });
        },
        trigger: function () {
            var self = this,
                args = Array.prototype.slice.call(arguments),
                topics = args[0].split(' ');

            topics.push('all');
            args.shift();
            args.unshift({
                eventTime: self._getISOStringDateTime()
            });

            topics.forEach(function (topic) {
                args[0].topic = topic;
                if (self._events.hasOwnProperty(topic)) {
                    self._events[topic].forEach(function (func) {
                        func.apply(self, args);
                    });
                } else {
                    return undefined;
                }
            });
        },
        _getISOStringDateTime: function () {
            var currentDate = new Date();

            return currentDate.toISOString();
        }
    };

    Base.Extend = Core.Helpers.Extend;
    Core.Base = Base;
}());