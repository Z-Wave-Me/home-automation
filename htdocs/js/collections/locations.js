define([
    //libs
    'backbone',
    'models/location'
], function (Backbone, LocationM) {
    'use strict';
    var LocationsCollection =  Backbone.Collection.extend({
        // model reference
        model: LocationM,
        methodToURL: {
            'read': '/locations',
            'create': '/locations',
            'update': '/locations',
            'delete': '/locations'
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
            return response.data || response;
        },

        initialize: function () {
           log('Init locations');
        }

    });

    return LocationsCollection;

});