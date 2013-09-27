/*** ZAutomation Common Widgets module ****************************************

Version: 1.0.0
(c) ZWave.Me, 2013
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Description: This module registers common widgets library

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function CommonWidgets (id, controller) {
    CommonWidgets.super_.call(this, id, controller);

    this.widgets = {
        "sensor": {
            code: "sensor.js",
            class: "FanWidget",
            mainUI: "sensor.html",
            settingsUI: "sensorSettings.html"
        },
        "fan": {
            code: "fan.js",
            class: "FanWidget",
            mainUI: "fan.html",
            settingsUI: "fanSettings.html"
        },
        "multilevel": {
            code: "multilevel.js",
            class: "FanWidget",
            mainUI: "multilevel.html",
            settingsUI: "multilevelSettings.html"
        },
        "probe": {
            code: "probe.js",
            class: "FanWidget",
            mainUI: "sensor.html",
            settingsUI: "sensorSettings.html"
        },
        "switch": {
            code: "switch.js",
            class: "FanWidget",
            mainUI: "switch.html",
            settingsUI: "switchSettings.html"
        },
        "thermostat": {
            code: "thermostat.js",
            class: "FanWidget",
            mainUI: "thermostat.html",
            settingsUI: "thermostatSettings.html"
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

    Object.keys(this.widgets).forEach(function (id) {
        var widget = self.widgets[id];
        var meta = {
            id: id,
            code: "CommonWidgets/"+widget.code,
            mainUI: "CommonWidgets/"+widget.mainUI,
            settingsUI: "CommonWidgets/"+widget.settingsUI
        }

        self.controller.registerWidget(meta);
    });
};
