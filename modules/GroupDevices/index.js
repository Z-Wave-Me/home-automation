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

    this.vDev = this.controller.devices.create({
        deviceId: "GroupDevices_" + this.id,
        defaults: {
            metrics: {
                level: self.config.isDimmable ? 0 : "off",
                icon: '',
                title: 'Group ' + this.id
            }
        },
        overlay: {
            deviceType: this.config.isDimmable ? "switchMultilevel" : "switchBinary"
        },
        handler: function(command, args) {
            self.config.devices.forEach(function(dev) {
                var vDev = self.controller.devices.get(dev.device);
                if (vDev) {
                    if (command === "on" || command === "off" || (command === "exact" && vDev.get("deviceType") === "switchBinary")) {
                        vDev.performCommand((dev.invert ^ (command === "on" || (command === "exact" && args.level > 0)))? "on" : "off");
                    } else if (command === "exact") {
                        vDev.performCommand("exact", { level: dev.invert ? (99-args.level) : args.level });
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
        },
        moduleId: this.id
    });

    this.handler = function() {
        var associationType = self.config.associationType;
        console.log(associationType);
        switch(associationType) {
            case "noAssociation":
                // widget doesn't change
                break;
            case "oneOff-widgetOff":
                // for dimmers show minimal value from group
                // for switch show off
                var res = 99; // max value
                self.config.devices.forEach(function(xdev) {
                    var devValue = self.controller.devices.get(xdev.device).get("metrics:level");
                    if (devValue < res) {
                        res = devValue;
                    }
                });
                if (self.config.isDimmable) {
                    self.vDev.set("metrics:level", res);
                }
                else {
                    self.vDev.set("metrics:level", res > 0 ? "on" : "off");
                }
                
                break;
            case "oneOn-widgetOn":
                // for dimmers show maximum value from group
                // for switch show on
                var res = 0; // min value
                self.config.devices.forEach(function(xdev) {
                    var devValue = self.controller.devices.get(xdev.device).get("metrics:level");
                    if (devValue > res) {
                        res = devValue;
                    }
                });
                if (self.config.isDimmable) {
                    self.vDev.set("metrics:level", res);
                }
                else {
                    self.vDev.set("metrics:level", res > 0 ? "on" : "off");
                }
                break;
        }
    };
    
    this.config.devices.forEach(function(dev) {
        this.controller.devices.on(dev.device, "change:metrics:level", self.handler);
    });

};

GroupDevices.prototype.stop = function () {
    var self = this;
    
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    this.config.devices.forEach(function(dev) {
        this.controller.devices.off(dev.device, "change:metrics:level", self.handler);
    });

    GroupDevices.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
