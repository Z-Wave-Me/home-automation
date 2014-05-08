define([
    'backbone',
    'helpers/modal',
    'helpers/apis',
    'models/location',
    'models/profile',
    'views/preferences/modulesView',
    'text!templates/popups/preferences-menu.html',
    'text!templates/popups/_room.html',
    'text!templates/popups/_widget.html',
    'text!templates/popups/_profile.html',
    'dragsort',
    'magicsuggest'
], function (Backbone, ModalHelper, Apis, Location, Profile, ModulesView, PreferencesPopupTmp, RoomTmp, WidgetTmp, ProfileTmp) {
    'use strict';
    return Backbone.View.extend({

        initialize: function () {
            var that = this;
            _.bindAll(this, 'render', 'renderList', 'renderRooms', 'addRoom', 'renderWidgets', 'addDevice', 'addProfile');
            // Default collections and models
            that.Locations = window.App.Locations;
            that.Devices = window.App.Devices;
            that.Profiles = window.App.Profiles;
            that.modulesView = new ModulesView();
            that.type = null;

            // Jquery cached objects
            that.$preferencesButton = that.$el.find('.preferences-button');
            that.$template = $(_.template(PreferencesPopupTmp, {}));
            that.$topmenu = that.$template.find('.top-menu');
            that.$modulesMenu = that.$template.find('.modules-menu');
            that.$topmenu.hide();
            that.$leftSidebar = that.$template.find('.left-sidebar');
            that.$leftSidebar.hide();
            that.$ListContainer = that.$template.find('.list-container');
            that.$ListContainer.hide();
            that.$buttonContainer = that.$template.find('.footer-button');
            that.$buttonContainer.hide();
            that.$contentContainer = that.$template.find('.content-body');
            that.$template.find('.back-button').hide();

            that.$leftSidebar.find('.filter-sidebar').off().on('keyup', function () {
                var value = $(this).val();
                $(".items-list > li").each(function () {
                    if ($(this).text().toLowerCase().indexOf(value.toLowerCase()) > -1) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });
            });

            // listen
            that.listenTo(that.Locations, 'add', function (model) {
                if (that.type === 'rooms') {
                    that.addRoom(model);
                }
            });

            that.listenTo(that.Profiles, 'add', function (model) {
                if (that.type === 'general') {
                    that.addProfile(model);
                }
            });
        },

        render: function () {
            var that = this;

            that.$preferencesButton.on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                that.$template.find('.right-content-container').animate({opacity: 0}, 0);

                that.$template.find('.back-button').on('click', function () {
                    that.$template.find('.left-content-container').animate({'margin-left': '0%', opacity: 1}, 'fast');
                    that.$template.find('.right-content-container').animate({opacity: 0}, 'fast');
                    that.$buttonContainer.hide();
                    that.$template.find('.back-button').hide('fast');
                    that.$topmenu.hide();
                    that.$modulesMenu.hide();
                    that.$template.find('.title').text('Menu');
                });

                that.$template.find('.close-button').on('click', function () {
                    that.$template.find('.back-button').click();
                    ModalHelper.hideAll();
                });

                that.$template.find('.menu-container li').on('click', function () {
                    that.renderList($(this).attr('data-menu'));
                    that.$template.find('.back-button').show('fast');
                    that.$template.find('.left-content-container').animate({'margin-left': '-50%', opacity: 0}, 'fast');
                    that.$template.find('.right-content-container').animate({opacity: 1}, 'fast');
                });

                that.Locations.fetch({
                    remove: false,
                    merge: true
                });

                ModalHelper.popup(that.$template, true, true);
            });
        },
        renderList: function (type) {
            var that = this;
            that.$template.find('.title').text(type.capitalize());

            // hide containers
            that.$leftSidebar.hide();
            that.$ListContainer.hide();
            that.$buttonContainer.hide();
            that.$contentContainer.empty();
            that.$ListContainer.find('.items-list').empty();
            that.type = type;

            if (type === 'rooms') {
                that.$topmenu.show().find('li').off().on('click', function () {
                    var $this = $(this);
                    that.$topmenu.find('li').removeClass('active');
                    $this.addClass('active');
                    that.$template.find('.form-horizontal').hide('fast', function () {
                        that.$template.find('.' + $this.attr('data-type') + '-tab').show('fast');
                    });
                });
                that.renderRooms();
            } else if (type === 'widgets') {
                that.renderWidgets();
            } else if (type === 'general') {
                that.renderProfiles();
            } else if (type === 'automation') {
                that.$modulesMenu.show().find('li').off().on('click', function () {
                    var $this = $(this);
                    that.$modulesMenu.find('li').removeClass('active');

                    if (!$this.hasClass('active')) {
                        that.modulesView.renderInstances();
                    }

                    $this.addClass('active');
                });
                that.modulesView.setElement(that.$template[0]);
                that.modulesView.render();
                that.modulesView.renderInstances();
            }
        },
        renderWidgets: function () {
            var that = this;
            that.$leftSidebar.find('.title-sidebar').text('Widgets');
            that.$leftSidebar.show();
            that.$ListContainer.show();
            that.Devices.each(function (device) {
                that.addDevice(device);
            });
        },
        addDevice: function (device) {
            var that = this,
                $device = $("<li title='" + device.get('metrics').title + "'>" + device.get('metrics').title + "</li>"),
                $deviceTmp,
                avalaibleTags = that.getTags(),
                tags = device.get('tags'),
                ms,
                profile,
                widget,
                active;

            device.on('change:metrics', function () {
                $device.attr('title', device.get('metrics').title);
                $device.text(device.get('metrics').title);
            });

            $device.on('click', function () {
                active = that.Profiles.isShow(device.id);
                that.$ListContainer.find('li').removeClass('active');
                $device.addClass('active');
                $deviceTmp = $(_.template(WidgetTmp, {device: device.toJSON(), widget: active}));

                $deviceTmp.hide();
                that.$contentContainer.html($deviceTmp);
                that.$ListContainer.find('li').removeClass('.active');
                $deviceTmp.show('fast');

                $deviceTmp.find('.input-dashboard').on('change', function () {
                    widget = that.Profiles.getDevice(device.id);
                    widget.show = !!$(this).prop('checked');
                    App.Profiles.setDevice(widget);
                });

                ms = $deviceTmp.find('#ms-gmail').magicSuggest({
                    width: 250,
                    highlight: true,
                    data: avalaibleTags,
                    value: tags
                });

                $(ms).on('beforerender', function () {
                    $(ms).setValue(tags);
                });

                $(ms).on('blur', function () {
                    this.setValue(this.getValue());
                    tags = this.getValue();
                    device.set({
                        tags: tags
                    });
                    avalaibleTags = that.getTags();
                });

                $deviceTmp.find('.save-button').on('click', function (e) {
                    e.preventDefault();
                    var metrics = device.get('metrics');
                    metrics.title = $deviceTmp.find('#inputTitleText').val();
                    metrics.icon = $deviceTmp.find('#inputIcon').val();
                    $device.text(metrics.title);
                    device.save({
                        metrics: metrics
                    });
                    device.trigger('change:metrics');
                });
            });

            // append
            that.$ListContainer.find('li').removeClass('.active');
            $device.hide();
            that.$ListContainer.find('.items-list').append($device);
            $device.show('fast');
        },
        renderProfiles: function () {
            var that = this,
                $newProfile,
                profile;

            that.$leftSidebar.find('.title-sidebar').text('Profiles');
            that.$leftSidebar.show();
            that.$ListContainer.show();
            that.$buttonContainer.show();

            that.Profiles.each(function (model) {
                that.addProfile(model);
            });

            that.$buttonContainer.find('.add-button').off().on('click', function () {
                that.$ListContainer.find('li').removeClass('active');
                $newProfile = $(_.template(ProfileTmp, {}));

                $newProfile.find('.create-button').on('keyup', function (e) {
                    if (e.which === 13) {
                        e.preventDefault();
                        $newProfile.find('.create-button').click();
                    }
                });

                $newProfile.find('.button-group').on('click', function (e) {
                    e.preventDefault();
                    if ($(this).hasClass('create-button')) {
                        if ($newProfile.find('#inputActive').prop('checked')) {
                            that.Profiles.where({active: true}).forEach(function (model) {
                                model.save({active: false});
                            });
                        }
                        profile = new Profile();
                        profile.save({
                            name: $newProfile.find('#inputNameProfile').val(),
                            description: $newProfile.find('#inputDescriptionsText').val(),
                            active: $newProfile.find('#inputActive').prop('checked')
                        }, {
                            success: function (model) {
                                that.Profiles.add(model);
                            }
                        });
                    }

                    $newProfile.hide('fast', function () {
                        $newProfile.remove();
                    });
                });

                that.$contentContainer.html($newProfile);
                that.$ListContainer.find('li').removeClass('.active');
                $newProfile.show('fast');
            });

            that.$buttonContainer.find('.remove-button').off().on('click', function () {
                that.Profiles.get(that.activeProfile).destroy();
            });
        },
        renderRooms: function () {
            var that = this, $newRoomTmp, location;
            that.$leftSidebar.find('.title-sidebar').text('Rooms');
            that.$leftSidebar.show();
            that.$ListContainer.show();
            that.$buttonContainer.show();

            that.$ListContainer.find('.item-list').empty();

            that.Locations.each(function (model) {
                that.addRoom(model);
            });

            that.$buttonContainer.find('.add-button').off().on('click', function () {
                that.$ListContainer.find('li').removeClass('active');
                $newRoomTmp = $(_.template(RoomTmp, {}));

                $newRoomTmp.find('.create-button').on('keyup', function (e) {
                    if (e.which === 13) {
                        e.preventDefault();
                        $newRoomTmp.find('.create-button').click();
                    }
                });

                $newRoomTmp.find('.button-group').on('click', function (e) {
                    e.preventDefault();
                    if ($(this).hasClass('create-button')) {
                        location = new Location();
                        location.save({title: $newRoomTmp.find('#inputNameText').val()}, {
                            success: function (model) {
                                that.Locations.add(model);
                            }
                        });
                    }
                    $newRoomTmp.hide('fast', function () {
                        $newRoomTmp.remove();
                    });
                });

                that.$contentContainer.html($newRoomTmp);
                that.$ListContainer.find('li').removeClass('.active');
                $newRoomTmp.show('fast');
            });

            that.$buttonContainer.find('.remove-button').off().on('click', function () {
                that.Locations.get(that.activeRoom).destroy();
            });
        },
        addRoom: function (model) {
            var that = this, $location, $template,
                json = model.toJSON();

            json.devicesCurrent = [];
            json.devicesAvalaible = [];
            that.Devices.each(function (device) {
                if (device.get('location') === model.get('id')) {
                    json.devicesCurrent.push(device.toJSON());
                } else {
                    json.devicesAvalaible.push(device.toJSON());
                }
            });
            json.countCurrent = json.devicesCurrent.length;

            $location = $("<li>" + model.get('title') + "</li>");

            that.listenTo(model, 'change:title', function () {
                $location.text(model.get('title'));
            });

            that.listenTo(model, 'destroy', function () {
                $location.hide('fast', function () {
                    $location.prev().click();
                    $location.remove();
                });
            });

            $location.off().on('click', function () {
                that.activeRoom = model.get('id');

                that.$ListContainer.find('li').removeClass('active');
                $location.addClass('active');
                $template = $(_.template(RoomTmp, json));

                $template.on('keyup', function (e) {
                    if (e.which === 13) {
                        e.preventDefault();
                        $template.find('.save-button').click();
                    }
                });

                that.listenTo(model, 'change:counter', function () {
                    $template.find('.get-devices').text(model.get('counter') + ' devices');
                });

                $template.find('.save-button').on('click', function (e) {
                    e.preventDefault();
                    model.save({title: $template.find('#inputNameText').val()}, {
                        success: function () {
                            $template.find('.edit-button').show();
                            $template.find('.name-location').text(model.get('title')).show();
                            $template.find('#inputNameText').val(model.get('title')).hide();
                            $template.find('.save-button').hide();
                            $template.find('.cancel-button').hide();
                        }
                    });
                });

                $template.find('.icon-container').on('click', function () {
                    $template.find('.get-file').click();
                });

                $template.find('.get-file').on('change', function (e) {
                    var file = e.target.files[0];
                    Apis.uploadFile(file, function (t) {
                       log(t);
                    });
                });

                $template.find('.edit-button').on('click', function (e) {
                    e.preventDefault();
                    var $this = $(this);
                    $template.find('.name-location').hide();
                    $template.find('#inputNameText').show();
                    $template.find('.save-button').show();
                    $this.hide();
                    $template.find('.cancel-button').show('fast').off().on('click', function (e) {
                        e.preventDefault();
                        $template.find('.name-location').text(model.get('title')).show();
                        $template.find('#inputNameText').val(model.get('title')).hide();
                        $template.find('.save-button').hide();
                        $template.find('.cancel-button').hide();
                        $this.show();
                    });
                });

                $template.find('.list-devices-column').dragsort({ dragSelector: "li", dragEnd: function () {
                    var $this = $(this),
                        id = $this.attr('data-id'),
                        listType = $this.parents(1).attr('data-type-list');

                    if (listType === 'all') {
                        that.Devices.get(id).save({
                            "location": null
                        });
                    } else {
                        that.Devices.get(id).save({
                            "location": that.activeRoom
                        });
                    }
                    model.set({counter: that.Devices.where({location: that.activeRoom}).length});
                }, dragBetween: true, placeHolderTemplate: "<li class='device drop-template'></li>" });

                that.$topmenu.find('li').removeClass('active');
                that.$topmenu.find('li:first').addClass('active');

                if ($('.room').exists()) {
                    $('.room').hide('fast', function () {
                        that.$contentContainer.html($template);
                        $template.show('fast');
                    });
                } else {
                    that.$contentContainer.html($template);
                    $template.show('fast');
                }
            });

            that.$ListContainer.find('.items-list').append($location);
        },
        addProfile: function (model) {
            var that = this,
                $profile = $("<li>" + model.get('name') + "</li>"),
                $template;

            that.listenTo(model, 'change:name', function () {
                $profile.text(model.get('name'));
            });

            that.listenTo(model, 'destroy', function () {
                $profile.hide('fast', function () {
                    $profile.prev().click();
                    $profile.remove();
                });
            });

            $profile.off().on('click', function () {
                that.activeProfile = model.get('id');

                that.$ListContainer.find('li').removeClass('active');
                $profile.addClass('active');
                $template = $(_.template(ProfileTmp, model.toJSON()));


                $template.find('.edit-button').on('click', function (e) {
                    e.preventDefault();
                    var $this = $(this);
                    $template.find('.name-profile').hide();
                    $template.find('#inputNameProfile').show();
                    $template.find('.description-profile').hide();
                    $template.find('#inputDescriptionsText').show();
                    $template.find('#inputActive').removeAttr("disabled");
                    $this.hide();

                    $template.find('.save-button').show('fast').off().on('click', function (e) {
                        e.preventDefault();
                        if ($template.find('#inputActive').prop('checked')) {
                            that.Profiles.where({active: true}).forEach(function (model) {
                                model.save({active: false});
                            });
                        }
                        model.save({
                            name: $template.find('#inputNameProfile').val(),
                            description: $template.find('#inputDescriptionsText').val(),
                            active: $template.find('#inputActive').prop('checked')
                        });
                        $template.find('.edit-button').show();
                        $template.find('.name-profile').text(model.get('name')).show();
                        $template.find('#inputNameProfile').val(model.get('name')).hide();
                        $template.find('.description-profile').text(model.get('description')).show();
                        $template.find('#inputDescriptionsText').val(model.get('description')).hide();
                        $template.find('#inputActive').attr("disabled", "disabled");
                        $template.find('.save-button').hide();
                        $template.find('.cancel-button').hide();
                    });

                    $template.find('.cancel-button').show('fast').off().on('click', function (e) {
                        e.preventDefault();
                        $template.find('.name-profile').text(model.get('name')).show();
                        $template.find('#inputNameProfile').val(model.get('name')).hide();
                        $template.find('.description-profile').text(model.get('description')).show();
                        $template.find('#inputDescriptionsText').val(model.get('description')).hide();
                        $template.find('#inputActive').attr("disabled", "disabled");
                        $template.find('.save-button').hide();
                        $template.find('.cancel-button').hide();
                        $this.show();
                    });
                }).show();


                if ($('.profile, .room').exists()) {
                    $('.profile, .room').hide('fast', function () {
                        that.$contentContainer.html($template);
                        $template.show('fast');
                    });
                } else {
                    that.$contentContainer.html($template);
                    $template.show('fast');
                }
            });

            that.$ListContainer.find('.items-list').append($profile);
        },
        getTags: function () {
            var that = this,
                tags = _.uniq(_.flatten(that.Devices.pluck('tags')));

            if (tags.indexOf('tags') === -1) {
                tags.push('dashboard');
            }
            return _.compact(tags);
        }
    });
});