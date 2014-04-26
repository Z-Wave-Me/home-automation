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
            var that = this;
            that.Devices = window.App.Devices;
        },
        render: function (fixedPosition, forceView) {
            var that = this;
            that.fixedPosition = fixedPosition || null;
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
                if (model.get('deviceType') === "probe" || model.get('deviceType') === "sensor" || model.get('deviceType') === "battery") {
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

                that.showingControl(modelView, model, forceView);

                if (that.fixedPosition) {
                    that.setPosition(modelView);
                } else {
                    that.clearPosition(modelView);
                }
            }
        },
        setPosition: function (modelView) {
            var device = App.Profiles.getDevice(modelView.model.id),
                $template = modelView.getTemplate();

            $template.animate({
                top: device.position.y,
                left: device.position.x
            });
        },
        clearPosition: function (modelView) {
            var $template = modelView.getTemplate();
            $template.animate({
                top: 0,
                left: 0
            }, {
                complete: function () {
                    $template.removeAttr('style');
                }
            });
        },
        showingControl: function (modelView, forceView) {
            var $template = modelView.getTemplate();
            if (App.Profiles.isShow(modelView.model.id) || forceView) {
                $template.show();
                window.$tmp = $template;
            }
        }
    });
});