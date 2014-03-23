define([
    "helpers/apis",
    "backbone",
    "text!templates/widgets/switchcontrol-small.html"
], function (Apis, Backbone, templateSwitchControl) {
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
                isHold,
                command;

            that.$template = $(_.template(templateSwitchControl, model.toJSON()));

            if (!that.Devices.activeMode) {
                that.$template.addClass('clear');
            } else {
                that.$template.removeClass('clear');
            }

            that.listenTo(window.App.Devices, 'settings normal', function () {
                that.$template.toggleClass('clear');
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

            that.$template.find('.quad-button').mousehold(function (i) {
                if (i > 2 && isHold !== true) {
                    isHold = true;
                    command = $(this).hasClass('up-button') ? 'upstart' : 'downstart';
                    Apis.devices.command(model.get('id'), command, {});
                }
            });

            that.$template.find('.quad-button').on('mouseup', function (i) {
                if (isHold) {
                    command = $(this).hasClass('up-button') ? 'upstop' : 'downstop';
                    Apis.devices.command(model.get('id'), command, {});
                } else {
                    command = $(this).hasClass('up-button') ? 'on' : 'off';
                    Apis.devices.command(model.get('id'), command, {});
                    isHold = false;
                }
            });

            that.$template.find('.quad-button').on('mousedown', function (i) {
                isHold = false;
            });

            if (!$('div[data-widget-id="' + that.model.id + '"]').exists()) {
                that.$el.append(that.$template);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"]').replaceWith(that.$template);
            }
        },
        getTemplate: function () {
            return this.$template;
        }
    });
});