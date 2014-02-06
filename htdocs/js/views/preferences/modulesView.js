define([
    'backbone',
    'text!templates/popups/_room.html',
    'text!templates/popups/_schema.html',
    'models/instance',
    'alpaca'
], function (Backbone, RoomTmp, SchemaTmp, Instance) {
    'use strict';

    return Backbone.View.extend({

        initialize: function () {
            var that = this;
            _.bindAll(this, 'render', 'renderInstances', 'renderModules', 'newInstance');
            // Default collections and models
            that.Instances = window.App.Instances;
            that.Modules = window.App.Modules;

            // cached objects
            that.$leftList = that.$el.find('.items-list');

            that.listenTo(that.Instances, 'add', function (instance) {
                that.renderInstanceList(instance);
            });
        },

        render: function () {
            var that = this;
            that.$el.find('.footer-button').show();
            that.$el.find('.left-sidebar').show();
            that.$el.find('.list-container').show();
            that.$el.find('.list-container').find('.title-sidebar').text('Instances:');
            that.$el.find('.items-list').empty();
            that.$el.find('.add-button').off().on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                that.newInstance();
            });
            that.$el.find('.remove-button').off().on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
            });
        },

        renderInstances: function () {
            var that = this;

            that.Instances.each(function (instance) {
                that.renderInstanceList(instance);
            });
        },

        renderInstanceList: function (instance) {
            var $instance,
                that = this;

            $instance = $("<li> Instance #" + instance.get('id') + "</li>");
            that.$el.find('.items-list').append($instance);
        },

        renderModules: function () {
            var that = this;
        },

        newInstance: function () {
            var that = this,
                editor,
                $schema;

            $schema = $(_.template(SchemaTmp, {
                modules: that.Modules.toJSON()
            }));

            $schema.find('.selectModules').on('change', function () {
                var $this = $(this);

                that.$el.find('.alpaca-form').empty().alpaca({
                    data: App.Modules.get(parseInt($this.val())).get('params'),
                    schema: App.Modules.get(parseInt($this.val())).get('schema'),
                    options: App.Modules.get(parseInt($this.val())).get('options'),
                    postRender: function (form) {
                        that.$el.find('.save-button').on('click', function (e) {
                            e.preventDefault();
                            var json = form.getValue(),
                                instance = new Instance();

                            instance.save({moduleId: parseInt($this.val()), params: json}, {
                                success: function () {
                                    that.Instances.add(instance);
                                }
                            });
                        });

                    }
                });
            });

            that.$el.find('.content-body').append($schema);
        }
    });
});