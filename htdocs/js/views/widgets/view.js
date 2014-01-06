define([
    "helpers/apis",
    "backbone",
    "text!templates/widgets/probe-small.html",
    "text!templates/widgets/fan-small.html",
    "text!templates/widgets/doorlock-small.html",
    "text!templates/widgets/complementary-small.html",
    "text!templates/widgets/thermostat-small.html",
    "text!templates/widgets/switch-small.html"
], function (Apis, Backbone, templateProbe, templateFan, templateDoorlock, templateComplementary, templateThermostat, templateSwitch) {
    'use strict';
    var WidgetsView = Backbone.View.extend({
        el: '#devices-container',
        initialize: function () {
            _.bindAll(this, 'render', 'renderWidget', 'renderWidgets');
            var that = this;
            that.Devices = window.App.Devices;
            that.Locations = window.App.Locations;

            that.listenTo(that.Locations, 'filter', function () {
                that.Devices.each(function (device) {
                    if (window.App.filters.locations) {
                        if (that.Locations.activeRoom === 'all' || that.Locations.activeRoom === device.get('location')) {
                            device.trigger('show');
                        } else {
                            device.trigger('hide');
                        }
                    }
                });
            });

            that.listenTo(that.Devices, 'filter', function () {
                that.Devices.each(function (device) {
                    if (window.App.filters.types) {
                        if (that.Devices.activeType === 'all' || that.Devices.activeType === device.get('deviceType')) {
                            device.trigger('show');
                        } else {
                            device.trigger('hide');
                        }
                    } else if (window.App.filters.tags) {
                        if (that.Devices.activeTag === 'all' || device.get('tags').indexOf(that.Devices.activeTag) !== -1) {
                            device.trigger('show');
                        } else {
                            device.trigger('hide');
                        }
                    }
                });
            });

            that.listenToOnce(that.Devices, 'sync', function () {
                that.renderWidgets();
            });
        },
        render: function () {
            var that = this;
            if (that.Devices.length > 0) {
                that.renderWidgets();
            }
        },
        renderWidgets: function () {
            var that = this;
            that.$el.empty();
            that.Devices.each(function (device) {
                if (device.get('deviceType') === "probe" || device.get('deviceType') === "battery") {
                    that.renderWidget(device, templateProbe);
                } else if (device.get('deviceType') === "fan") {
                    that.renderWidget(device, templateFan);
                } else if (device.get('deviceType') === "switchMultilevel") {
                    that.renderWidget(device, templateComplementary);
                } else if (device.get('deviceType') === "thermostat") {
                    that.renderWidget(device, templateThermostat);
                } else if (device.get('deviceType') === "doorlock") {
                    that.renderWidget(device, templateDoorlock);
                } else if (device.get('deviceType') === "switchBinary") {
                    that.renderWidget(device, templateSwitch);
                }
            });
        },
        renderWidget: function (device, template) {
            var that = this,
                json = device.toJSON(),
                $template;

            $template = $(_.template(template, json));

            that.listenTo(device, 'show', function () {
                $template.removeClass('show').addClass('show').show('fast');
            });

            that.listenTo(device, 'hide', function () {
                $template.removeClass('show').hide('fast');
            });

            if (!that.isExistWidget(device.get('id'))) {
                that.$el.append($template);
            } else {
                that.$el.find('div[data-widget-id="' + device.get('id') + '"]').replaceWith($template);
            }
        },
        isExistWidget: function (id) {
            return $('div[data-widget-id="' + id + '"]').exists();
        }
    });

    return WidgetsView;
});