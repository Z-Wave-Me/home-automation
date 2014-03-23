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

    this.controller.emit("scenes.register", this.id, this.config.title, function() {
        self.config.switches.forEach(function(devState) {
            var vDev = self.controller.findVirtualDeviceById(devState.device);
            if (vDev) {
                vDev.performCommand(devState.state ? "on" : "off");
            }
        });
        self.config.dimmers.forEach(function(devState) {
            var vDev = self.controller.findVirtualDeviceById(devState.device);
            if (vDev) {
                vDev.performCommand(devState.state);
            }
        });
        self.config.scenes.forEach(function(scene) {
            var vDev = self.controller.findVirtualDeviceById(scnee);
            if (vDev) {
                vDev.performCommand("on");
            }
        });
    });
};

LightScene.prototype.stop = function () {
    this.controller.emit("scenes.unregister", this.id);

    LightScene.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
