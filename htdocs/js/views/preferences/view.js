define([
    'backbone',
    'helpers/modal',
    'helpers/apis',
    'models/location',
    'text!templates/popups/preferences-menu.html',
    'text!templates/popups/_room.html',
    'text!templates/popups/_widget.html',
    'dragsort',
    'magicsuggest'
], function (Backbone, ModalHelper, Apis, Location, PreferencesPopupTmp, RoomTmp, WidgetTmp, TagTmp) {
    'use strict';
    var PreferencesView = Backbone.View.extend({

        initialize: function () {
            var that = this;
            _.bindAll(this, 'render', 'renderList', 'renderRooms', 'addRoom', 'renderWidgets', 'addDevice');
            // Default collections and models
            that.Locations = window.App.Locations;
            that.Devices = window.App.Devices;
            that.type = null;

            // Jquery cached objects
            that.$preferencesButton = that.$el.find('.preferences-button');
            that.$template = $(_.template(PreferencesPopupTmp, {}));
            that.$topmenu = that.$template.find('.top-menu');
            that.$topmenu.hide();
            that.$leftSidebar = that.$template.find('.left-sidebar');
            that.$leftSidebar.hide();
            that.$ListContainer = that.$template.find('.list-container');
            that.$ListContainer.hide();
            that.$buttonContainer = that.$template.find('.footer-button');
            that.$buttonContainer.hide();
            that.$contentContainer = that.$template.find('.content-body');
            that.$template.find('.back-button').hide();

            that.listenTo(that.Locations, 'add', function (model) {
                if (that.type === 'rooms') {
                    that.addRoom(model);
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
            }
        },
        renderWidgets: function () {
            var that = this;
            that.$leftSidebar.show();
            that.$ListContainer.show();
            that.Devices.each(function (device) {
                that.addDevice(device);
            });
        },
        addDevice: function (device) {
            var that = this,
                $device = $("<li>" + device.get('metrics').title + "</li>"),
                $deviceTmp,
                avalaibleTags = that.getTags(),
                tags = device.get('tags'),
                ms;

            $device.on('click', function () {
                that.$ListContainer.find('li').removeClass('active');
                $device.addClass('active');
                $deviceTmp = $(_.template(WidgetTmp, device.toJSON()));

                $deviceTmp.hide();
                that.$contentContainer.html($deviceTmp);
                that.$ListContainer.find('li').removeClass('.active');
                $deviceTmp.show('fast');

                ms = $deviceTmp.find('#ms-gmail').magicSuggest({
                    width: 250,
                    highlight: true,
                    data: avalaibleTags,
                    value: tags
                });

                $(ms).on('beforerender', function () {
                    log('afterrender');
                    $(ms).setValue(tags);
                });

                $(ms).on('blur', function () {
                    device.save({tags: this.getValue()});
                    this.setValue(this.getValue());
                    avalaibleTags = that.getTags();
                    tags = this.getValue();
                });
            });

            // append
            that.$ListContainer.find('li').removeClass('.active');
            $device.hide();
            that.$ListContainer.find('.items-list').append($device);
            $device.show('fast');
        },
        addTag: function (tag, device) {
            var that = this,
                $tag = $(_.template(TagTmp, {title: tag}));
        },
        renderRooms: function () {
            var that = this, $newRoomTmp, location;
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
        getTags: function () {
            var that = this;
            return _.uniq(_.flatten(that.Devices.pluck('tags')));
        }
    });

    return PreferencesView;
});