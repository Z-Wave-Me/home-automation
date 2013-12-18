define([
    //libs
    'backbone'
], function (Backbone) {
    'use strict';
    var Location =  Backbone.Model.extend({

        defaults: {
            title: null
        },

        methodToURL: {
            'read': '/locations/',
            'create': '/locations/',
            'update': '/locations/',
            'delete': '/locations/'
        },

        url: function () {
            var url = !this.isNew() ? this.get('id') : '';
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
        },
        parse: function (response) {
            return response.data;
        }
    });

    return Location;
});