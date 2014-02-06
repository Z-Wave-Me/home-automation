define([
    //libs
    'backbone',
    'models/module'
], function (Backbone, ModuleM) {
    'use strict';

    var InstancesCollection =  Backbone.Collection.extend({

        // model reference
        model: ModuleM,

        methodToURL: {
            'read': '/instances',
            'create': '/instances',
            'update': '/instances',
            'delete': '/instances'
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
           log('Init InstancesCollection');
        }

    });

    return InstancesCollection;
});