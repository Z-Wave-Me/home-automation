/*** LightScene Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    Implements light scene based on virtual devices of type dimmer, switch or anothe scene
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function LightScene (id, controller) {
    // Call superconstructor first (AutomationModule)
    LightScene.super_.call(this, id, controller);
}

inherits(LightScene, AutomationModule);

_module = LightScene;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

LightScene.prototype.init = function (config) {
    LightScene.super_.prototype.init.call(this, config);

    var self = this;

    this.vDev = this.controller.devices.create("LightScene_" + this.id, {
        deviceType: "toggleButton",
        metrics: {
            level: '',
            icon: '',
            title: 'Scene ' + this.id
        }
    }, function () {
        self.config.switches.forEach(function(devState) {
            var vDev = self.controller.devices.get(devState.device);
            if (vDev) {
                vDev.performCommand(devState.status ? "on" : "off");
            }
        });
        self.config.dimmers.forEach(function(devState) {
            var vDev = self.controller.devices.get(devState.device);
            if (vDev) {
                vDev.performCommand("exact", devState.state);
            }
        });
        self.config.scenes.forEach(function(scene) {
            var vDev = self.controller.devices.get(scene);
            if (vDev) {
                vDev.performCommand("on");
            }
        });
    });
};

LightScene.prototype.stop = function () {
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    LightScene.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
