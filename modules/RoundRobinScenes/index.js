/*** RoundRobinScenes Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    Switches scenes in round robin policy
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function RoundRobinScenes (id, controller) {
    // Call superconstructor first (AutomationModule)
    RoundRobinScenes.super_.call(this, id, controller);
}

inherits(RoundRobinScenes, AutomationModule);

_module = RoundRobinScenes;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

RoundRobinScenes.prototype.init = function (config) {
    RoundRobinScenes.super_.prototype.init.call(this, config);

    this.currentSceneIndex = -1;

    var self = this;
    
    this.vDev = this.controller.devices.create({
        deviceId: "RoundRobinScene_" + this.id,
        defaults: {
            deviceType: "toggleButton",
            metrics: {
                icon: '',
                title: 'Round Robin Scene ' + this.id
            }
        },
        handler: function () {
            self.currentSceneIndex++;
            self.currentSceneIndex %= self.config.scenes.length;

            var vDev = self.controller.devices.get(self.config.scenes[self.currentSceneIndex]);
            if (vDev) {
                vDev.performCommand("on");
            }
        },
        moduleId: this.id
    });
};

RoundRobinScenes.prototype.stop = function () {
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    RoundRobinScenes.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
