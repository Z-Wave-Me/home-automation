define([
    //libs
    'backbone',
    '../models/module'
], function (Backbone, ModuleM) {
    'use strict';

    var ModulesCollection =  Backbone.Collection.extend({

        // model reference
        model: ModuleM,

        methodToURL: {
            'read': '/modules',
            'create': '/modules',
            'update': '/modules',
            'delete': '/modules'
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

        initialized: function () {
            var that = this;
        }

    });

    return ModulesCollection;
});