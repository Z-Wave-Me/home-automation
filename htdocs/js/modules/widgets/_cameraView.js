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

            $popup.find('.ui-icon').on('click', function (e) {
                e.preventDefault();
                getUrl($(this).attr('data-url'));
            });

            that.$template.find('.ui-icon').on('click', function (e) {
                e.preventDefault();
                getUrl($(this).attr('data-url'));
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

            that.listenTo(that.model, 'change', function () {
                that.$template.find('.title-container').text(that.model.get('metrics').title);
            });

            that.listenTo(window.App.Devices, 'settings normal', function () {
                that.$template.toggleClass('clear');
            });

            that.listenTo(that.model, 'destroy reset', function () {
                that.$template.remove();
                that.remove();
            });

            that.listenTo(window.App.Devices, 'reset', function () {
                that.$template.remove();
                that.remove();
            });

            that.$template.find('.view-block').on('click', function (e) {
                e.preventDefault();

                $popup.find('.havePan-btn').on('click', function (e) {
                    e.preventDefault();
                    Apis.devices.command(that.model.get('id'), 'havePan', {});
                });

                $popup.find('.haveTilt-btn').on('click', function (e) {
                    e.preventDefault();
                    Apis.devices.command(that.model.get('id'), 'haveTilt', {});
                });

                $popup.find('.haveZoom-btn').on('click', function (e) {
                    e.preventDefault();
                    Apis.devices.command(that.model.get('id'), 'haveZoom', {});
                });

                $popup.find('.haveOpen-btn').on('click', function (e) {
                    e.preventDefault();
                    Apis.devices.command(that.model.get('id'), 'haveOpen', {});
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