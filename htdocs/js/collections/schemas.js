define([
    //libs
    'backbone',
    'models/schema'
], function (Backbone, SchemaM) {
    'use strict';

    var SchemasCollection =  Backbone.Collection.extend({

        // model reference
        model: SchemaM,

        methodToURL: {
            'read': '/schemas',
            'create': '/schemas',
            'update': '/schemas',
            'delete': '/schemas'
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

    return SchemasCollection;
});