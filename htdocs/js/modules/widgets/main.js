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
            _.bindAll(this, 'render', 'renderWidget');
            this.Devices = window.App.Devices;
        },
        render: function (fixedPosition, forceView) {
            this.fixedPosition = fixedPosition || null;
            if (this.Devices.length > 0) {
                this.$el.empty();
                if (!$("#devices-container").exists()) {
                    $('#main-region').append('<section id="devices-container" class="widgets"></section>');
                }
                this.Devices.each(function (device) {
                    this.renderWidget(device, forceView);
                }, this);
            }
        },
        renderWidget: function (model, forceView) {
            var that = this,
                modelView = null;

            if (model.get('deviceType') === "probe" || model.get('deviceType') === "battery") {
                modelView = new ProbeWidgetView({model: model});
            } else if (model.get('deviceType') === "fan") {
                modelView = new FanWidgetView({model: model});
            } else if (model.get('deviceType') === "switchMultilevel") {
                modelView = new MultilevelWidgetView({model: model});
            } else if (model.get('deviceType') === "thermostat") {
                modelView = new ThermostatView({model: model});
            } else if (model.get('deviceType') === "doorlock") {
                modelView = new DoorLockView({model: model});
            } else if (model.get('deviceType') === "switchBinary") {
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

            if (modelView) {
                modelView.render();
                that.showingControl(modelView, model, forceView);
                if (that.fixedPosition) {
                    that.setPosition(modelView);
                }
            }
        },
        setPosition: function (modelView) {
            var device = _.find(App.Profiles.findWhere({active: true}).get('widgets'), function (widget) { return widget.id === modelView.model.id; }),
                $template = modelView.getTemplate();

            if (device !== undefined) {
                $template.css({
                    top: device.position.y,
                    left: device.position.x
                });
            } else {
                $template.css({
                    top: 0,
                    left: 0
                });
            }
        },
        showingControl: function (modelView, model, forceView) {
            var $template = modelView.getTemplate();
            if (_.any(App.Profiles.findWhere({active: true}).get('widgets'), function (widget) { return widget.id === model.id; }) || forceView) {
                $template.show();
            }
        }
    });
});
