define([
    //libs
    '../../../../bower_components/backbone/backbone',
    '../models/device'
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
            }

            Backbone.sync(method, model, options);
        },

        parse: function (response, xhr) {
            var that = this,
                list = [];

            if (response.data.structureChanged) {
                _.each(that.models, function (model) {
                    if (!_.any(response.data.devices, function (dev) { return model.id === dev.id; })) {
                        log('Remove model ' + model.id);
                        that.remove(model);
                    }
                });
            }

            this.updateTime = response.data.updateTime;
            return response.data.devices;
        },

        initialize: function () {
            var that = this;
            _.bindAll(this, 'parse');
            log('init devices');
        }

    });

    return DevicesCollection;

});