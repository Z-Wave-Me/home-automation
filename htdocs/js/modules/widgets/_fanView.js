define([
    "helpers/apis",
    "backbone",
    "text!templates/widgets/fan-small.html"
], function (Apis, Backbone, templateFan) {
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
                model = that.model;

            that.$template = $(_.template(templateFan, model.toJSON()));

            if (!that.Devices.activeMode) {
                that.$template.addClass('clear');
            } else {
                that.$template.removeClass('clear');
            }

            that.$template.hide();

            that.listenTo(model, 'show', function () {
                that.$template.removeClass('show').addClass('show').show('fast');
            });

            that.listenTo(model, 'hide', function () {
                that.$template.removeClass('show').hide('fast');
            });

            that.listenTo(that.model, 'change:metrics', function () {
                that.$template.find('.title-container').text(that.model.get('metrics').title);
                if (that.model.get('metrics').state !== true || that.model.get('metrics').state !== 'true') {
                    that.$template.find('select').val('-1');
                } else {
                    that.$template.find('select').val(that.model.get('metrics').currentMode);
                }
            });

            that.listenTo(window.App.Devices, 'settings', function () {
                that.$template.removeClass('clear');
            });

            that.listenTo(window.App.Devices, 'normal', function () {
                that.$template.addClass('clear');
            });

            that.$template.find(".select-field select").on('change', function () {
                var params = $(this).val() !== -1 ? {mode: $(this).val()} : {},
                    command = $(this).val() !== -1 ? 'setMode' : 'off';

                Apis.devices.command(model.get('id'), command, params, function (json) {
                    //log(json);
                });
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