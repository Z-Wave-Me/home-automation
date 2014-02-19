define([
    //libs
    'backbone'
], function (Backbone) {
    'use strict';
    var Schema =  Backbone.Model.extend({

        defaults: {
            title: 'New schema',
            schema: ''
        },

        methodToURL: {
            'read': '/schemas/',
            'create': '/schemas',
            'update': '/schemas/',
            'delete': '/schemas/'
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
        parse: function (response, xhr) {
            return response.data || response;
        }
    });

    return Schema;
});