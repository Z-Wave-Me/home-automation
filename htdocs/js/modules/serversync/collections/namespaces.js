define([
    //libs
    'backbone',
    '../models/namespace'
], function (Backbone, NamespaceM) {
    'use strict';

    var NamespacesCollection =  Backbone.Collection.extend({

        // model reference
        model: NamespaceM,

        methodToURL: {
            'read': '/namespaces',
            'create': '/namespaces',
            'update': '/namespaces',
            'delete': '/namespaces'
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
        }

    });

    return NamespacesCollection;
});