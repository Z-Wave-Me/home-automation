define([
    //libs
    'backbone'
], function (Backbone) {
    'use strict';
    var Profile =  Backbone.Model.extend({

        defaults: {
            name: 'New Profile',
            description: 'Description profile'
        },

        methodToURL: {
            'read': '/profiles/',
            'create': '/profiles',
            'update': '/profiles/',
            'delete': '/profiles/'
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

    return Profile;
});