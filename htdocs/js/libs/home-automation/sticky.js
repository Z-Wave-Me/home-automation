/*
    Sticky.js 0.1.0
    (c) Stanislav Morozov
    MIT license.
    For all details and documentation:
    https://github.com/Z-Wave-Me/home-automation
*/

(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['exports'], function(exports) {
            root.Sticky = factory(root, exports);
            return root.Sticky;
        });
    } else if (typeof exports !== 'undefined') {
        var _ = require('underscore');
        module.exports = factory(root, exports);
    } else {
        root.Sticky = factory(root, {});
    }

}(this, function(root, exports) {

    'use strict';

    var Sticky;

    Sticky = function() {

        if ( Sticky.prototype._singletonInstance ) {
            return Sticky.prototype._singletonInstance;
        }

        Sticky.prototype._singletonInstance = this;

        var that = this;

        that.Namespaces = {};

        Sticky.prototype.isExist = function (name) {
            return that.Namespaces.hasOwnProperty(name);
        };

        Sticky.prototype.set = function (name, module, params, context) {
            params = params || {};
            if (Boolean(that.isExist(name))) {
                return that.Namespaces[name];
            } else {
                that.Namespaces[name] = new module(params, context);
            }

            return that.Namespaces[name];
        };

        Sticky.prototype.get = function (name) {
            return that.isExist(name) ? that.Namespaces[name] : undefined;
        };

        Sticky.prototype.list = function () {
            return that.Namespaces;
        };

        Sticky.prototype.remove = function (name) {
            if (that.is(name)) {
                if (that.Namespaces[name].hasOwnProperty('remove')) {
                    that.Namespaces[name].remove(function () {
                        delete that.Namespaces[name];
                    });
                } else {
                    delete that.Namespaces[name];
                }
            } else {
                return undefined;
            }
        };

        Sticky.prototype.clear = function () {
            var that = this;
            Object.keys(that.Namespaces).forEach(function (key) {
               that.remove(key);
            });
        }
    };


    return new Sticky();
}));