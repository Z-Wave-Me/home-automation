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

    this.vDev = this.controller.devices.create(
        "GroupDevices_" + (this.config.isDimmable ? "bn" : "ml") + "_" + this.id, { // different names to rebuild UI on change
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
            var vDev = self.controller.devices.get(dev.device);
            if (vDev) {
                if (command === "on" || command === "off" || (command === "exact" && vDev.get("deviceType") === "switchBinary")) {
                    vDev.performCommand((dev.invert ^ (command === "on" || (command === "exact" && args.level > 0)))? "on" : "off");
                } else if (command === "exact") {
                    vDev.performCommand("exact", { level: dev.invert ? args.level : (99-args.level) });
                }
            }
        });

        if (command === "on" || command === "off") {
            var scenes = command === "on" ? self.config.scenesOn : self.config.scenesOff;
        
            scenes.forEach(function(scene) {
                var vDev = self.controller.devices.get(scene);
                if (vDev) {
                    vDev.performCommand("on");
                }
            });
        }
        
        var level = command;
        if (self.config.isDimmable) {
            if (command === "on") {
                level = 99;
            } else if (command === "off") {
                level = 0;
            } else {
                level = args.level;
            }
        }
        this.set("metrics:level", level);
    });
};

GroupDevices.prototype.stop = function () {
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    GroupDevices.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
