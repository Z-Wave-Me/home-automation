define([
    //libs
    'backbone',
    'models/profile'
], function (Backbone, ProfileM) {
    'use strict';

    var ProfilesCollection =  Backbone.Collection.extend({

        // model reference
        model: ProfileM,

        methodToURL: {
            'read': '/profiles',
            'create': '/profiles',
            'update': '/profiles',
            'delete': '/profiles'
        },

        url: function () {
            var url = this.id !== undefined ? '/' + this.id : '';
            return url;
        },

        sync: function (method, model, options) {
            options = options || {};
            options.url = model.methodToURL[method.toLowerCase()] + this.url();
            Backbone.sync(method, model, options);
        },

        parse: function (response, xhr) {
            return response.data;
        },

        initialize: function () {
           log('Init ProfilesCollection');
        }

    });

    return ProfilesCollection;
});