/*** GroupDevices Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    Groups several devices together to make a new virtual device
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function GroupDevices (id, controller) {
    // Call superconstructor first (AutomationModule)
    GroupDevices.super_.call(this, id, controller);
}

inherits(GroupDevices, AutomationModule);

_module = GroupDevices;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

GroupDevices.prototype.init = function (config) {
    GroupDevices.super_.prototype.init.call(this, config);

    var self = this;

    this.vDev = this.controller.collection.create("GroupDevices_" + this.id, {
        deviceType: this.config.isDimmable ? "switchMultilevel" : "switchBinary",
        metrics: {
            probeTitle: '',
            scaleTitle: '',
            level: '',
            icon: '',
            title: 'Group ' + this.id
        }
    }, function(command, args) {
        self.config.devices.forEach(function(dev) {
            var vDev = self.controller.findVirtualDeviceById(dev.device);
            if (vDev) {
                if (command === "on" || command === "off")
                    vDev.performCommand((dev.invert ^ command === "on")? "on" : "off");
                else if (command === "exact")
                    vDev.performCommand(command, dev.invert ? args[0] : (99-args[0]));
            }
        });

        if (command === "on" || command === "off") {
            var scenes = command === "on" ? self.config.scenesOn : self.config.scenesOff;
        
            scenes.forEach(function(scene) {
                var vDev = self.controller.findVirtualDeviceById(scene);
                if (vDev) {
                    vDev.performCommand("on");
                }
            });
        }
    });
};

GroupDevices.prototype.stop = function () {
    if (this.vDev) {
        self.controller.collection.remove(this.vDev.id);
        this.vDev = null;
    }

    GroupDevices.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
