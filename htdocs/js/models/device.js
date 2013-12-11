define([
    //libs
    'backbone'
], function (Backbone) {
    'use strict';
    var Device =  Backbone.Model.extend({

        defaults: {
            deviceType: null,
            lock: true,
            metrics: {}
        },

        methodToURL: {
            'read': '/devices/',
            'create': '/devices/',
            'update': '/devices/',
            'delete': '/devices/'
        },

        url: function () {
            var url = '';
            return url;
        },

        sync: function (method, model, options) {
            options = options || {};
            options.url = model.methodToURL[method.toLowerCase()] + this.url();

            Backbone.sync(method, model, options);
        },

        initialize: function () {
            this.bind('error', function (model, err) {
                log("ERROR: " + err);
            });
        }
    });

    return Device;
});