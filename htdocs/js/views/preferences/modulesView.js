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
            var that = this,
                instance;

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
                if (that.instanceActive) {
                    instance = that.Instances.get(that.instanceActive);
                    that.Modules.get(instance.get('moduleId')).set({created: false});
                    instance.destroy();
                    $('.modules-container').hide('fast', function () {
                        $('.modules-container').off().remove();
                    });
                }
            });
        },

        renderInstances: function () {
            var that = this;

            that.$el.find('.items-list').empty();

            that.Instances.each(function (instance) {
                that.renderInstanceList(instance);
            });
        },

        renderInstanceList: function (instance) {
            var $instance,
                that = this;

            $instance = $("<li>" + instance.get('params').title + "</li>");

            that.listenTo(instance, 'destroy', function () {
                $instance.hide('fast', function () {
                    $instance.prev().click();
                    $instance.remove();
                });
            });

            that.listenTo(instance, 'change:params', function () {
                $instance.text(instance.get('params').title);
            });

            $instance.on('click', function (e) {
                var $template = $('<div class="widget-container modules-container"><div class="module edit"><div class="form-group alpaca-form"></div><div class="form-group button-group"><div class="input-group"><button class="button-group save-button">save</button></div> </div></div></div>');
                e.preventDefault();
                that.$el.find('.items-list').find('li').removeClass('active');
                that.instanceActive = instance.id;
                $instance.addClass('active');
                that.$el.find('.content-body').empty().append($template);

                that.$el.find('.alpaca-form').empty().alpaca({
                    data: instance.get('params'),
                    schema: App.Modules.get(instance.get('moduleId')).get('schema'),
                    options: App.Modules.get(instance.get('moduleId')).get('options'),
                    postRender: function (form) {
                        that.$el.find('.save-button').on('click', function (e) {
                            e.preventDefault();
                            var json = form.getValue();
                            instance.save({params: json});
                            $template.hide('fast', function () {
                                $template.off().remove();
                                $instance.removeClass('active');
                            });
                        });
                    }
                });
            });

            that.$el.find('.items-list').append($instance);
        },

        renderModules: function () {
            var that = this;
        },

        newInstance: function () {
            var that = this,
                $schema;

            $schema = $(_.template(SchemaTmp, {
                modules: that.Modules.select(function (model) {
                    var result = false;
                    if (!model.get('singleton') || (model.get('singleton') && !model.get('created'))) {
                        result = true;
                    }
                    return result;
                })
            }));

            $schema.find('.selectModules').on('change', function () {
                var $this = $(this);
                that.$el.find('.alpaca-form').empty().alpaca({
                    data: App.Modules.get($this.val()).get('defaults'),
                    schema: App.Modules.get($this.val()).get('schema'),
                    options: App.Modules.get($this.val()).get('options'),
                    postRender: function (form) {
                        that.$el.find('.save-button').on('click', function (e) {
                            e.preventDefault();
                            var json = form.getValue(),
                                instance = new Instance();

                            instance.save({moduleId: $this.val(), params: json}, {
                                success: function () {
                                    that.Instances.add(instance);
                                    that.Modules.get(instance.get('moduleId')).set({created: true});
                                    $schema.hide('fast', function () {
                                        $schema.off().remove();
                                    });
                                }
                            });
                        });
                    }
                });
            });

            that.$el.find('.items-list').find('li').removeClass('active');
            that.$el.find('.content-body').empty().append($schema);
        }
    });
});