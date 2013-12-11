define([
    //libs
    'backbone'
], function (Backbone) {
    'use strict';
    var Notice =  Backbone.Model.extend({

        //defaults: {
        //    title: null
        //},

        methodToURL: {
            'read': '/notifications/',
            'create': '/notifications/',
            'update': '/notifications/',
            'delete': '/notifications/'
        },

        url: function () {
            var url = '';
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
        }
    });

    return Notice;
});