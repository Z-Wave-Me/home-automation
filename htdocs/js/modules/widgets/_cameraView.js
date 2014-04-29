define([
    "helpers/apis",
    "helpers/modal",
    "backbone",
    "text!templates/widgets/camera-big.html",
    "text!templates/popups/camera.html"
], function (Apis, Modal, Backbone, templateCam, templateCameraPopup) {
    'use strict';

    return Backbone.View.extend({
        el: '#devices-container',

        initialize: function () {
            _.bindAll(this, 'render', 'getTemplate');
            var that = this;

            that.Devices = window.App.Devices;
        },
        render: function () {
            var that = this,
                model = that.model,
                $popup = $(_.template(templateCameraPopup, that.model.toJSON())),
                cameraImage = new Image();

            that.$template = $(_.template(templateCam, model.toJSON()));

            if (!that.Devices.activeMode) {
                that.$template.addClass('clear');
            } else {
                that.$template.removeClass('clear');
            }

            that.$template.hide();

            that.$template.find('.command-button').off().on('click', function (e) {
                e.preventDefault();
                Apis.devices.command(that.model.get('id'), $(this).attr('data-command'), {});
            });

            $(cameraImage).on('load', function () {
                that.$template.find('.camera-image').attr({'src': $(cameraImage).attr('src')});
                that.loadImage = true;
            });


            that.listenTo(model, 'show', function () {
                that.$template.removeClass('show').addClass('show').show('fast');
            });

            that.listenTo(model, 'hide', function () {
                that.$template.removeClass('show').hide('fast');
            });

            that.listenTo(that.model, 'change:metrics', function () {
                that.$template.find('.title-container').text(that.model.get('metrics').title);
            });

            that.listenTo(window.App.Devices, 'settings', function () {
                that.$template.removeClass('clear');
            });

            that.listenTo(window.App.Devices, 'normal', function () {
                that.$template.addClass('clear');
            });

            that.$template.find('.view-block').on('click', function (e) {
                e.preventDefault();

                $popup.find('.command-button').off().on('click', function (e) {
                    e.preventDefault();
                    Apis.devices.command(that.model.get('id'), $(this).attr('data-command'), {});
                });

                if (!that.loadImage) {
                    $(cameraImage).on('load', function () {
                        $popup.find('.camera-image').attr({src: cameraImage.src});
                        $popup.center();
                    });
                } else {
                    $popup.find('.camera-image').attr({src: cameraImage.src});
                    $popup.center();
                }

                Modal.popup($popup, true, true);
            });

            if (!$('div[data-widget-id="' + that.model.id + '"]').exists()) {
                that.$el.append(that.$template);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"]').replaceWith(that.$template);
            }

            cameraImage.src = that.model.get('metrics').url;
        },
        getTemplate: function () {
            return this.$template;
        }
    });
});