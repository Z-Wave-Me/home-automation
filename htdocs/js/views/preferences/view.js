define([
    'backbone',
    'helpers/modal',
    'models/location',
    'text!templates/popups/preferences-menu.html',
    'text!templates/popups/_room.html',
    'dragsort'
], function (Backbone, ModalHelper, Location, PreferencesPopupTmp, RoomTmp) {
    'use strict';
    var PreferencesView = Backbone.View.extend({

        initialize: function () {
            var that = this;
            _.bindAll(this, 'render', 'renderList', 'renderRooms', 'addRoom');
            // Default collections and models
            that.Locations = window.App.Locations;
            that.Devices = window.App.Devices;

            // Jquery cached objects
            that.$preferencesButton = that.$el.find('.preferences-button');
            that.$template = $(_.template(PreferencesPopupTmp, {}));
            that.$topmenu = that.$template.find('.top-menu');
            that.$topmenu.hide();
            that.$leftSidebar = that.$template.find('.left-sidebar');
            that.$leftSidebar.hide();
            that.$roomsListContainer = that.$template.find('.rooms-list-container');
            that.$roomsListContainer.hide();
            that.$buttonContainer = that.$template.find('.footer-button');
            that.$buttonContainer.hide();
            that.$contentContainer = that.$template.find('.content-body');
            that.$template.find('.back-button').hide();

            that.listenTo(that.Locations, 'add', function (model) {
                that.addRoom(model);
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
            }
        },
        renderRooms: function () {
            var that = this, $newRoomTmp, location;
            that.$leftSidebar.show();
            that.$roomsListContainer.show();
            that.$buttonContainer.show();

            that.$roomsListContainer.find('.rooms-list').empty();

            that.Locations.each(function (model) {
                that.addRoom(model);
            });

            that.$buttonContainer.find('.add-button').off().on('click', function () {
                that.$roomsListContainer.find('li').removeClass('active');
                $newRoomTmp = $(_.template(RoomTmp, {}));
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
                that.$roomsListContainer.find('li').removeClass('.active');
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

                that.$roomsListContainer.find('li').removeClass('active');
                $location.addClass('active');
                $template = $(_.template(RoomTmp, json));

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
                }, dragBetween: true, placeHolderTemplate: "<li></li>" });

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

            that.$roomsListContainer.find('.rooms-list').append($location);
        }
    });

    return PreferencesView;
});