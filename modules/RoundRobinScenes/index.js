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
                level: 'on', // it is always on, but usefull to allow bind
                icon: '',
                title: 'Round Robin Scene ' + this.id
            }
        },
        overlay: {},
        handler: function () {
            self.currentSceneIndex++;
            self.currentSceneIndex %= self.config.scenes.length;

            var vDev = self.controller.devices.get(self.config.scenes[self.currentSceneIndex]);
            if (vDev) {
                vDev.performCommand("on");
            }
            
            self.vDev.set("metrics:level", "on"); // update on ourself to allow catch this event
        },
        moduleId: this.id
    });
    
    if (this.config.trackCurrent) {
        this.tracker = function(vDev) {
            for (var i in self.config.scenes) {
                if (self.config.scenes[i] === vDev.id) {
                    self.currentSceneIndex = i;
                }
            }
        };
        
        for (var i in this.config.scenes) {
            this.controller.devices.on(self.config.scenes[i], "change:metrics:level", this.tracker);
        }
    }
};

RoundRobinScenes.prototype.stop = function () {
    if (this.config.trackCurrent) {
        for (var i in this.config.scenes) {
            this.controller.devices.off(self.config.scenes[i], "change:metrics:level", this.tracker);
        }

        this.tracker = null;
    }

    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    RoundRobinScenes.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
