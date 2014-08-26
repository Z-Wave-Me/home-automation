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

            _.bindAll(this, 'addGroup', 'render', 'renderInstances', 'renderInstanceList', 'saveState');

            // Default collections and models
            that.Instances = window.App.Instances;
            that.Modules = window.App.Modules;
            that.Profiles = window.App.Profiles;

            that.groupTemplate = '<li class="group-container" data-id="<%= groupId %>"><div class="group-name down"><%= groupId %></div><div data-id="<%= groupId %>" class="instances-container"></div></li>'

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
            that.$el.find('.list-container').find('.title-sidebar').text('Rules:');
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

            that.$el.find('.add-folder-button').off().on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var profile = that.Profiles.getActive(),
                    groupId  = _.uniqueId('newGroup_'),
                    groups = that.getGroups();

                if (!groups.hasOwnProperty(groupId)) {
                    groups[groupId] = [];
                }

                delete groups['other'];

                profile.save({groups: _.extend(profile.get('groups'), {instances: groups})}, {
                    success: function () {
                        that.addGroup(groupId);
                    }
                });
            }).show();
        },

        renderInstances: function () {
            var that = this,
                $containers;

            that.$el.find('.items-list').empty();

            Object.keys(that.getGroups()).forEach(that.addGroup);

            $containers = that.$el.find( ".instances-container" );

            $containers.sortable({
                connectWith: '.instances-container',
                items: '.instance-item',
                dropOnEmpty: true,
                start: function (event, ui) {
                    that.$el.find( ".instances-container").addClass('drop');
                },
                stop: function (event, ui) {
                    that.$el.find( ".instances-container").removeClass('drop');
                },
                update: function (event, ui) {
                    var groups = that.getGroups(),
                        active = that.Profiles.getActive();

                    _.each(Object.keys(groups), function (grp) {
                        groups[grp] = _.map(that.$el.find('.group-container[data-id="' + grp + '"]').find('.instances-container').children(), function (child) {
                            return $(child).data('id');
                        });
                    });

                    delete groups.other;

                    active.save({groups: _.extend(active.get('groups'), {instances: groups})});
                }
            }).disableSelection();


            that.Instances.each(function (instance) {
                that.renderInstanceList(instance);
            });

            if (!Boolean(that.Instances.length)) {
                that.newInstance();
            } else {
                if (that.$el.find('.items-list').children().length > 0) {
                    that.$el.find('.items-list').children()[0].click();
                }
            }
        },

        renderInstanceList: function (instance) {

            var $instance,
                that = this,
                group = that.getGroup(instance.id);

            $instance = $("<li class='instance-item' data-id='" + instance.id + "'><div class='text-title pull-left'>" + instance.get('params').title + "</div><div class='circle pull-left'></li>");

            if (instance.get('params').status === 'enable') {
                $instance.addClass('enable');
            } else {
                $instance.removeClass('enable')
            }

            that.listenTo(instance, 'destroy reset remove', function () {
                $instance.hide('fast', function () {
                    $instance.prev().click();
                    $instance.remove();
                });
            });

            that.listenTo(instance, 'change:params', function () {
                $instance.find('.text-title').text(instance.get('params').title);
            });

            $instance.on('click', function (e) {
                e.preventDefault();
                var $template = $('<div class="widget-container modules-container"><div class="module edit"><h3 class="instance-block">' + that.Modules.get(instance.get('moduleId')).get('defaults').title +'</h3><div class="form-group alpaca-form"></div><div class="form-group button-group"><div class="input-group"><button class="button-group just-hidden save-button">Save</button></div> </div></div></div>');
                that.$el.find('.items-list').find('li').removeClass('active');
                that.instanceActive = instance.id;
                $instance.addClass('active');
                that.$el.find('.content-body').empty().append($template);
                window.App.Namespaces.fetch({
                    remove: false,
                    merge: true,
                    success: function () {
                        window.App.Modules.fetch({
                            remove: false,
                            merge: true
                        });

                        window.App.Instances.fetch({
                            remove: false,
                            merge: true,
                            success: function () {
                                that.$el.find('.alpaca-form').empty().alpaca({
                                    data: instance.get('params'),
                                    schema: App.Modules.get(instance.get('moduleId')).get('schema'),
                                    options: App.Modules.get(instance.get('moduleId')).get('options'),
                                    postRender: function (form) {
                                        that.$el.find('.save-button').off().on('click', function (e) {
                                            e.preventDefault();
                                            var json = form.getValue();
                                            if (Validator.validate(json, App.Modules.get(instance.get('moduleId')).get('schema'))) {
                                                instance.save({params: json});
                                                $template.hide('fast', function () {
                                                    $template.off().remove();
                                                    $instance.removeClass('active');
                                                    if (instance.get('params').status === 'enable') {
                                                        $instance.addClass('enable');
                                                    } else {
                                                        $instance.removeClass('enable')
                                                    }
                                                });
                                                that.$el.find('.alpaca-controlfield-message-text').css('color', '#222');
                                            } else {
                                                that.$el.find('.alpaca-controlfield-message-text').css('color', 'red');
                                            }
                                        });
                                    }
                                });
                                that.$el.find('.alpaca-controlfield-message-text').css('color', '#222');
                                $template.find('.save-button').fadeIn();
                            }
                        });
                    }
                });
            });

            that.$el.find('.group-container[data-id="' + group + '"]').find('.instances-container').append($instance);
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
                window.App.Namespaces.fetch({
                    remove: false,
                    merge: true,
                    success: function () {
                        window.App.Modules.fetch({
                            remove: false,
                            merge: true
                        });

                        window.App.Instances.fetch({
                            remove: false,
                            merge: true,
                            success: function () {
                                that.$el.find('.alpaca-form').empty().alpaca({
                                    data: App.Modules.get($this.val()).get('defaults'),
                                    schema: App.Modules.get($this.val()).get('schema'),
                                    options: App.Modules.get($this.val()).get('options'),
                                    postRender: function (form) {
                                        that.$el.find('.save-button').off().on('click', function (e) {
                                            e.preventDefault();
                                            var json = form.getValue(),
                                                instance = new Instance();

                                            if (Validator.validate(json, App.Modules.get($this.val()).get('schema'))) {
                                                instance.save({moduleId: $this.val(), params: json}, {
                                                    success: function () {
                                                        that.Instances.add(instance);
                                                        that.Modules.get(instance.get('moduleId')).set({created: true});
                                                        $schema.hide('fast', function () {
                                                            $schema.off().remove();
                                                        });
                                                    }
                                                });
                                                that.$el.find('.alpaca-controlfield-message-text').css('color', '#222');
                                            } else {
                                                that.$el.find('.alpaca-controlfield-message-text').css('color', 'red');
                                            }
                                        });
                                    }
                                });
                                $schema.find('.save-button').fadeIn();
                            }
                        });
                    }
                });
            });

            that.$el.find('.items-list').find('li').removeClass('active');
            that.$el.find('.content-body').empty().append($schema);
        },

        addGroup: function (groupId) {
            var that = this,
                $template = $(_.template(that.groupTemplate, {groupId: groupId}));


            $template.find('.group-name').on('click', function (e) {
                e.preventDefault();

                if ($(this).hasClass('down')) {
                    $template.find('.instances-container').stop().slideUp('fast');
                } else {
                    $template.find('.instances-container').stop().slideDown('fast');
                }

                $(this).toggleClass('down').disableSelection();
            });

            if (that.$el.find('.group-container[data-id="other"]').exists()) {
                $template.insertBefore(that.$el.find('.group-container[data-id="other"]'));
            } else {
                that.$el.find('.items-list').append($template);
            }

        },

        getGroups: function () {
            var that = this,
                activeProfile = that.Profiles.getActive();

            return _.defaults(activeProfile.get('groups').instances, {other: []});
        },

        getGroup: function (instanceId) {
            var that = this,
                groups = that.getGroups(),
                group = _.find(Object.keys(groups), function (key) {
                    return groups[key].indexOf(instanceId) !== -1;
                });

            return group || 'other';
        },

        saveState: function () {

        }
    });
});