define([
    //libs
    'backbone',
    'models/device'
], function (Backbone, DeviceM) {
    'use strict';
    var DevicesCollection =  Backbone.Collection.extend({
        // model reference
        model: DeviceM,
        activeMode: false,
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


            if (this.updateTime !== undefined && !this.structureChanged) {
                options.data.since = this.updateTime;
            } else if (this.structureChanged) {
                options.data.since = 0;
                this.reset();
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