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
                            "type": "string",
                            "required": true,
                            "default": "enable",
                            "enum": ["enable", "disable"]
                        };
                    }

                    if (!schema.properties.hasOwnProperty('title')) {
                        schema.properties.title = {
                            "type": "string",
                            "required": true
                        };
                    }

                    if (!schema.properties.hasOwnProperty('description')) {
                        schema.properties.description =  {
                            "type": "string",
                            "required": true
                        };
                    }

                    //fields
                    if (!options.fields.hasOwnProperty('status')) {
                        options.fields.status = {
                            "type": "select",
                            "label": "Status",
                            "helper": "",
                            "optionLabels": ["Enabled", "Disabled"]
                        };
                    }

                    if (!options.fields.hasOwnProperty('title')) {
                        options.fields.title = {
                            "type": "text",
                            "label": "Title"
                        };
                    }

                    if (!options.fields.hasOwnProperty('description')) {
                        options.fields.description =  {
                            "type": "textarea",
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
                defaultObject = {
                    "focus": true,
                    "type": "object",
                    "validate": true,
                    "disabled": false,
                    "showMessages": true,
                    "collapsible": true,
                    "legendStyle": "button",
                    "toolbarSticky": true,
                    "renderForm": false
                },
                prop,
                namespace,
                App = window.App;

            function r(obj) {
                var key, arr = [], union;
                if (obj) {
                    for (key in obj) {
                        if (typeof obj[key] === "object") {
                            r(obj[key]);
                        } else if (_.isString(obj[key])) {
                            if (obj[key].indexOf('namespaces') !== -1 && obj[key].split(':').length > 1) {
                                obj[key].split(',').forEach(function (val) {
                                    namespace = App.Namespaces.get(val.split(':')[1]) || [];
                                    if (namespace && namespace.attributes) { // check that it existsd in namespaces
                                        arr = arr.concat(_.pluck(namespace.get('params'), val.split(':')[2]));
                                    }
                                });

                                obj[key] = arr || [];
                                arr = [];
                            }
                        }
                    }
                }
                return obj;
            }

            prop = r(model.toJSON());

            // options
            if (options) {
                Object.keys(defaultObject).forEach(function (key) {
                    options[key] = defaultObject[key];
                });


                if (options.hasOwnProperty('fields')) {
                    Object.keys(options.fields).forEach(function (key) {
                        if (!options.fields[key].hasOwnProperty('helpers')) {
                            options.fields[key].toolbarSticky = true;
                        }
                    });
                }

                model.set({options: prop.options});
            }

            // schema
            if (schema) {
                model.set({schema: prop.schema});
            }


        },
        parse: function (response, xhr) {
            return response.data || response;
        }
    });

    return Module;
});