define([
    //libs
    'backbone',
    'models/device'
], function (Backbone, DeviceM) {
    'use strict';
    var DevicesCollection =  Backbone.Collection.extend({
        // model reference
        model: DeviceM,
        methodToURL: {
            'read': '/devices',
            'create': '/devices',
            'update': '/devices',
            'delete': '/devices'
        },

        url: function () {
            var url = this.id !== undefined ? '/' + this.id : '';
            return url;
        },

        sync: function (method, model, options) {
            options = options || {};
            options.data = options.data || {};
            options.url = model.methodToURL[method.toLowerCase()] + this.url();

            if (this.updateTime !== undefined) {
                options.data.since = this.updateTime;
            }

            Backbone.sync(method, model, options);
        },

        parse: function (response, xhr) {
            this.updateTime = response.data.updateTime;
            return response.data.devices;
        },

        initialize: function () {
           log('init devices');
        }

    });

    return DevicesCollection;

});