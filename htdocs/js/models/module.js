define([
    //libs
    'backbone'
], function (Backbone) {
    'use strict';

    var Module =  Backbone.Model.extend({

        methodToURL: {
            'read': '/modules/',
            'create': '/modules',
            'update': '/modules/',
            'delete': '/modules/'
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

            this.listenTo(this, 'add', function (model, err) {
                var schema = model.get('schema'),
                    options = model.get('options');

                if (schema && options) {
                    if (!schema.hasOwnProperty('properties')) {
                        schema.properties = {};
                    }

                    if (!options.hasOwnProperty('fields')) {
                        options.fields = {};
                    }


                    if (!schema.properties.hasOwnProperty('status')) {
                        schema.properties.status = {
                            "type": "select",
                            "required": true,
                            "enum": ["enable", "disable"]
                        };
                    }

                    if (!options.fields.hasOwnProperty('status')) {
                        options.fields.status = {
                            "type": "select",
                            "required": true,
                            "enum": ["enable", "disable"]
                        };
                    }

                    model.set({
                        schema: schema,
                        options: options
                    });
                }
            });
        },
        parse: function (response, xhr) {
            return response.data || response;
        }
    });

    return Module;
});