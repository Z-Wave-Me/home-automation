/*** GroupDevices Z-Way HA module *******************************************

Version: 2.1.0
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    Groups several devices together to make a new virtual device

Changelog:
16.12.2015 (aivs) - Added selector to set how group widget associated with devices in group: 1) not associated, 2) show biggest value, 3) show smaller value
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

    var self = this,
    icon = "",
    level = "",
    deviceType = this.config.isDimmable ? "switchMultilevel" : "switchBinary";

    switch(deviceType) {
        case "switchBinary":
            icon = "switch";
            level = "off";
            break;
        case "switchMultilevel":
            icon = "multilevel";
            level = 0;
            break;
    }

    var defaults = {
        metrics: {
            title: self.getInstanceTitle()
        }
    };
 
    var overlay = {
            deviceType: deviceType,
            metrics: {
                icon: icon,
                level: level
            }      
    };

    this.vDev = this.controller.devices.create({
        deviceId: "GroupDevices_" + this.id,
        defaults: defaults,
        overlay: overlay,
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
                    // check dimmer value
                    if (devValue < res) {
                        res = devValue;
                    }
                    // check switch value. If one of all switch turned off, show 0
                    if (devValue === "off") {
                        res = 0;
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
                    // check dimmer value
                    if (devValue > res) {
                        res = devValue;
                    }
                    // check switch value. If all dimmers turned OFF and one of all switches turned on, show 1
                    if (devValue === "on" && res === 0) {
                        res = 1;
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

