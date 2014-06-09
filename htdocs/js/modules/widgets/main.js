/* global: _, $, define */
define([
    "backbone",
    "modules/widgets/_probeView",
    "modules/widgets/_fanView",
    "modules/widgets/_multilevelView",
    "modules/widgets/_thermostatView",
    "modules/widgets/_doorView",
    "modules/widgets/_switchView",
    "modules/widgets/_switchControlView",
    "modules/widgets/_toggleView",
    "modules/widgets/_cameraView"
], function (Backbone, ProbeWidgetView, FanWidgetView, MultilevelWidgetView, ThermostatView, DoorLockView, SwitchView, SwitchControlView, ToggleView, CameraView) {
    'use strict';

    return Backbone.View.extend({
        el: '#devices-container',
        initialize: function () {
            _.bindAll(this, 'render', 'renderWidget', 'show', 'checkFilter');
            var that = this;
            that.Devices = window.App.Devices;
        },
        render: function (forceView) {
            var that = this;
            if (that.Devices.length > 0) {
                if (!$("#devices-container").exists()) {
                    $('#main-region').append('<section id="devices-container" class="widgets"></section>');
                }

                that.Devices.each(function (device) {
                    that.renderWidget(device, forceView);
                });
            }
        },
        renderWidget: function (model, forceView) {
            var that = this,
                modelView = model.view || null;

            if (!modelView) {
                if (model.get('deviceType') === "sensorBinary" || model.get('deviceType') === "sensorMultilevel" || model.get('deviceType') === "battery") {
                    modelView = new ProbeWidgetView({model: model});
                } else if (model.get('deviceType') === "fan") {
                    modelView = new FanWidgetView({model: model});
                } else if (model.get('deviceType') === "switchMultilevel") {
                    modelView = new MultilevelWidgetView({model: model});
                } else if (model.get('deviceType') === "thermostat") {
                    modelView = new ThermostatView({model: model});
                } else if (model.get('deviceType') === "doorlock") {
                    modelView = new DoorLockView({model: model});
                } else if (model.get('deviceType') === "switchBinary" || model.get('deviceType') === "switchRGBW") {
                    modelView = new SwitchView({model: model});
                } else if (model.get('deviceType') === "toggleButton") {
                    modelView = new ToggleView({model: model});
                } else if (model.get('deviceType') === "camera") {
                    modelView = new CameraView({model: model});
                } else if (model.get('deviceType') === "switchControl") {
                    modelView = new SwitchControlView({model: model});
                } else {
                    //log(model);
                }
            }

            if (modelView) {
                if (!model.view) {
                    model.view = modelView;
                    modelView.render();
                }

                that.listenTo(model, 'remove', function () {
                    modelView.getTemplate().fadeOut(function () {
                        modelView.getTemplate().remove();
                    });
                });

                that.show(modelView, forceView);
            }
        },
        show: function (modelView, forceView) {
            var that = this,
                $template = modelView.getTemplate();
            if (App.Profiles.getDevice(modelView.model.id) || forceView) {
                $template.fadeIn().addClass('show');
            } else {
                if (that.checkFilter(modelView.model)) {
                    $template.fadeOut().removeClass('show');
                }
            }
        },
        checkFilter: function (model) {
            var result = true,
                filters = window.App.filters;

            if (filters.locations) {
                result = model.get('location') === window.App.Locations.activeRoom || window.App.Devices.activeRoom === 'all';
            } else if (filters.tags) {
                result = model.get('tags').indexOf(window.App.Devices.activeTag) !== -1 || window.App.Devices.activeTag === 'all';
            } else if (filters.types) {
                result = model.get('deviceType') === window.App.Devices.activeType || window.App.Devices.activeType === 'all';
            }

            return result;
        }
    });
});
