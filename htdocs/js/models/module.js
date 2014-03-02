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
            var that = this;
            that.bind('error', function (model, err) {
                log("ERROR: " + err);
            });

            that.listenTo(that, 'add change', function (model, err) {
                var schema = model.get('schema'),
                    options = model.get('options');

                if (schema && options) {
                    if (!schema.hasOwnProperty('properties')) {
                        schema.properties = {};
                    }

                    if (!options.hasOwnProperty('fields')) {
                        options.fields = {};
                    }


                    // properties
                    if (!schema.properties.hasOwnProperty('status')) {
                        schema.properties.status = {
                            "type": "select",
                            "required": true,
                            "enum": ["enable", "disable"]
                        };
                    }

                    if (!schema.properties.hasOwnProperty('title')) {
                        schema.properties.title = {
                            "type": "text",
                            "required": true,
                            "minimum": 0,
                            "maximum": 6
                        };
                    }

                    if (!schema.properties.hasOwnProperty('description')) {
                        schema.properties.description =  {
                            "type": "textarea",
                            "required": true,
                            "minimum": 0,
                            "maximum": 6
                        };
                    }

                    //fields
                    if (!options.fields.hasOwnProperty('status')) {
                        options.fields.status = {
                            "type": "select",
                            "required": true,
                            "label": "Status",
                            "helper": "",
                            "enum": ["enable", "disable"]
                        };
                    }

                    if (!options.fields.hasOwnProperty('title')) {
                        options.fields.title = {
                            "type": "text",
                            "required": true,
                            "label": "Title"
                        };
                    }

                    if (!options.fields.hasOwnProperty('description')) {
                        options.fields.description =  {
                            "type": "textarea",
                            "required": true,
                            "label": "Description"
                        };
                    }

                    model.set({
                        schema: schema,
                        options: options
                    });
                }
                that.getNamespacesData(model);
            });
        },
        getNamespacesData: function (model) {
            var schema = model.get('schema'),
                options = model.get('options'),
                prop,
                option,
                namespace,
                field,
                App = window.App;

            // options
            if (options) {
                if (options.hasOwnProperty('fields')) {
                    _.each(_.keys(options.fields), function (key) {
                        if (options.fields[key].hasOwnProperty('datasource')) {
                            option = options.fields[key];
                            field = options.fields[key].field;
                            if (_.isString(option[field]) && _.isString(options.fields[key][field])) {
                                namespace = _.pluck(App.Namespaces.get(option[field].split(':')[1]).get('params'), options.fields[key][field].split(':')[2]);
                                options.fields[key][field] = namespace;
                                model.set({options: options});
                            }
                        }
                    });
                }
            }

            // schema
            if (schema) {
                if (schema.hasOwnProperty('properties')) {
                    _.each(_.keys(schema.properties), function (key) {
                        if (schema.properties[key].hasOwnProperty('datasource')) {
                            prop = schema.properties[key];
                            field = schema.properties[key].field;
                            if (_.isString(prop[field])) {
                                if (prop.hasOwnProperty('items')) {
                                    namespace = _.pluck(App.Namespaces.get(prop.items[field].split(':')[1]).get('params'), prop.items[field].split(':')[2]);
                                    schema.properties[key].items[field] = namespace;
                                } else {
                                    namespace = _.pluck(App.Namespaces.get(prop[field].split(':')[1]).get('params'), prop[field].split(':')[2]);
                                    schema.properties[key][field] = namespace;
                                }
                            }

                            model.set({schema: schema});
                        }
                    });
                }
            }
        },
        parse: function (response, xhr) {
            return response.data || response;
        }
    });

    return Module;
});