define([
    'backbone',
    'helpers/modal',
    'models/location',
    'text!templates/popups/preferences-menu.html',
    'text!templates/popups/_new_room.html'
], function (Backbone, ModalHelper, Location, PreferencesPopupTmp, NewRoomTmp) {
    'use strict';
    var PreferencesView = Backbone.View.extend({

        initialize: function () {
            var that = this;
            _.bindAll(this, 'render', 'renderList', 'renderRooms');
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
                });

                that.$template.find('.close-button').on('click', function () {
                    that.$template.find('.back-button').click();
                    ModalHelper.hideAll();
                });

                that.$template.find('.menu-container li').on('click', function () {
                    that.renderList($(this).attr('data-menu'));
                    that.$template.find('.left-content-container').animate({'margin-left': '-50%', opacity: 0}, 'fast');
                    that.$template.find('.right-content-container').animate({opacity: 1}, 'fast');
                });

                ModalHelper.popup(that.$template, true, true);
            });
        },
        renderList: function (type) {
            var that = this;
            if (type === 'rooms') {
                that.renderRooms();
            }
        },
        renderRooms: function () {
            var that = this, $newRoomTmp, $roomItem, location, $location;
            that.$leftSidebar.show();
            that.$roomsListContainer.show();
            that.$buttonContainer.show();
            that.$roomsListContainer.find('li').off().on('click', function () {
                that.$roomsListContainer.find('li').removeClass('active');
                $(this).addClass('active');
            });

            that.Locations.fetch({
                remove: false,
                merge: true,
                success: function (models) {
                    log(models)
                    models.each(function (location) {
                        $location = $("<li>" + location.get('title') + "</li>");
                        that.$roomsListContainer.find('.rooms-list').append($location);
                    });
                }
            });

            that.$buttonContainer.find('.add-button').off().on('click', function () {
                $newRoomTmp = $(_.template(NewRoomTmp, {}));
                $roomItem = $("<li class='active'>Undefined</li>");
                $newRoomTmp.find('.button-group').on('click', function (e) {
                    e.preventDefault();
                    if ($(this).hasClass('create-button')) {
                        $roomItem.html($newRoomTmp.find('#inputNameText').val());
                        location = new Location();
                        location.save({title: $newRoomTmp.find('#inputNameText').val()}, {
                            success: function () {
                                log('success');
                            }
                        });
                    } else {
                        $roomItem.hide('fast', function () {
                            $(this).remove();
                        });
                    }
                    $newRoomTmp.hide('fast', function () {
                        $newRoomTmp.remove();
                    });
                    that.creating = false;
                });

                that.$contentContainer.html($newRoomTmp);
                that.$roomsListContainer.find('li').removeClass('.active');
                that.$roomsListContainer.find('.rooms-list').append($roomItem);
                $newRoomTmp.show('fast');
                that.creating = true;
            });
        }
    });

    return PreferencesView;
});