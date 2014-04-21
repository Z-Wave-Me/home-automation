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
    
    this.vDev = this.controller.collection.create("RoundRobinScene_" + this.id, {
        deviceType: "toggleButton",
        metrics: {
            level: '',
            icon: '',
            title: 'Scene ' + this.id
        }
    }, function() {
        self.currentSceneIndex++;
        self.currentSceneIndex %= self.config.scenes.length;
        
        var vDev = self.controller.findVirtualDeviceById(self.config.scenes[self.currentSceneIndex]);
        if (vDev) {
            vDev.performCommand("on");
        }
    });
};

RoundRobinScenes.prototype.stop = function () {
    this.controller.collection.remove(this.vDev.id);

    RoundRobinScenes.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
