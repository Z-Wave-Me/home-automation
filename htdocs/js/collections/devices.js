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
            }

            Backbone.sync(method, model, options);
        },

        parse: function (response, xhr) {
            var data;
            this.updateTime = response.data.updateTime;

            if (response.data.structureChanged) {
                this.response = response.data.devices;
                this.each(function (model) { model.trigger('structureChanged'); });
            }

            return response.data.devices;
        },

        initialize: function () {
           log('init devices');
        }

    });

    return DevicesCollection;

});