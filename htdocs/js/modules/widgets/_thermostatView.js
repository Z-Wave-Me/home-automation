define([
    "helpers/apis",
    "backbone",
    "text!templates/widgets/thermostat-small.html"
], function (Apis, Backbone, templateThermostat) {
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

            that.prepare();

            that.$template = $(_.template(templateThermostat, that.model.toJSON()));

            if (!that.Devices.activeMode) {
                that.$template.addClass('clear');
            } else {
                that.$template.removeClass('clear');
            }

            that.$template.hide();

            that.listenTo(window.App.Devices, 'settings', function () {
                that.$template.removeClass('clear');
            });

            that.listenTo(window.App.Devices, 'normal', function () {
                that.$template.addClass('clear');
            });

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
                that.$template.find("select").val(that.model.get('metrics').currentMode);
            });

            that.$template.find(".select-field select").on('change', function () {
                var params,
                    command,
                    $this = $(this);

                if ($this.hasClass('mode-select')) {
                    params = String($this.val()) !== '-1' ? {mode: $this.val()} : {};
                    command = String($this.val()) !== '-1' ? 'setMode' : 'off';
                } else if ($this.hasClass('temp-select')) {
                    params = {temp: $this.val()};
                    command = 'setTemp';
                }

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
        prepare: function () {
            var that = this,
                metrics = that.model.get('metrics');

            if (that.model.get('metrics').hasMode) {
                if (_.values(that.model.get('metrics').modes).indexOf('Off') === -1) {
                    metrics.modes[-1] = 'Off';
                    that.model.set({metrics: metrics});
                }
            }
        },
        getTemplate: function () {
            return this.$template;
        }
    });
});
