/*** BindDevices Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    Bind actions on one device to others
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function BindDevices (id, controller) {
    // Call superconstructor first (AutomationModule)
    BindDevices.super_.call(this, id, controller);
}

inherits(BindDevices, AutomationModule);

_module = BindDevices;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

BindDevices.prototype.init = function (config) {
    BindDevices.super_.prototype.init.call(this, config);

    var self = this;

    this.handlerLevel = function (sDev) {
        var that = self,
            actionBinary = null,
            actionMultilevel = null,
            value = sDev.get("metrics:level");
        
        if (value === 255 || value === true || value === "on") {
            actionBinary = "on";
        } else if (value === 0 || value === false || value === "off") {
            actionBinary = "off";
        } else {
            actionBinary = "on";
            actionMultilevel = value;
        }
        
        self.config.targetDevices.forEach(function(el) {
            var vDev = that.controller.devices.get(el);
            
            if (vDev) {
                if (vDev.get("deviceType") === "switchBinary" || vDev.get("deviceType") === "scene" || vDev.get("deviceType") === "switchMultilevel" && actionMultilevel === null) {
                    vDev.performCommand(actionBinary);
                } else if ((vDev.get("deviceType") === "switchMultilevel") || (vDev.get("deviceType") === "thermostat")) {
                    vDev.performCommand("exact", { level: actionMultilevel });
                }
            }
        });
    };

    this.handlerChange = function (sDev) {
        var action = sDev.get("metrics:change");
        
        self.config.targetDevices.forEach(function(el) {
            var vDev = self.controller.devices.get(el);
            
            if (vDev) {
		if ((vDev.get("deviceType") === "switchMultilevel") || (vDev.get("deviceType") === "thermostat")) {
                    vDev.performCommand(action);
                }
            }
        });
    };

    // Setup metric update event listener
    self.config.sourceDevices.forEach(function(x) {
        self.controller.devices.on(x, 'change:metrics:level', self.handlerLevel);
        self.controller.devices.on(x, 'change:metrics:change', self.handlerChange);
    });
};

BindDevices.prototype.stop = function () {
    var self = this;
    
    self.config.sourceDevices.forEach(function(x) {
        self.controller.devices.off(x, 'change:metrics:level', self.handlerLevel);
        self.controller.devices.off(x, 'change:metrics:change', self.handlerChange);
    });

    BindDevices.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
