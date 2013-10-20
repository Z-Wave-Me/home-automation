/*** ZAutomation Common Widgets module ****************************************

Version: 1.0.0
(c) Z-Wave.Me, 2013
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Description: This module registers common widgets library

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function CommonWidgets (id, controller) {
    CommonWidgets.super_.call(this, id, controller);

    this.widgetClasses = {
        "FanWidget": {
            code: "fan.js",
            mainUI: "fan.html"
        },
        "MultilevelWidget": {
            code: "multilevel.js",
            mainUI: "multilevel.html"
        },
        "ProbeWidget": {
            code: "probe.js",
            mainUI: "probe.html"
        },
        "SensorWidget": {
            code: "sensor.js",
            mainUI: "sensor.html"
        },
        "SwitchWidget": {
            code: "switch.js",
            mainUI: "switch.html"
        },
        "ThermostatWidget": {
            code: "thermostat.js",
            mainUI: "thermostat.html"
        }
    };
}

inherits(CommonWidgets, AutomationModule);

_module = CommonWidgets;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

CommonWidgets.prototype.init = function (config) {
    CommonWidgets.super_.prototype.init.call(this, config);

    var self = this;

    Object.keys(this.widgetClasses).forEach(function (id) {
        var widget = self.widgetClasses[id];
        var meta = {
            className: id,
            code: "CommonWidgets/"+widget.code,
            mainUI: "CommonWidgets/"+widget.mainUI
        }

        self.controller.registerWidgetClass(meta);
    });
};
