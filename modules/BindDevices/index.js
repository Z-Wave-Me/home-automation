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

    this.handler = function (sDev) {
        var that = self;
        
        var actionBinary = null;
        var actionMultilevel = null;
        
        value = sDev.getMetricValue("level");
        if (value === 255 || value === true || value === "on") {
            actionBinary = "on";
        } else if (value === 0 || value === false || value === "off") {
            actionBinary = "off";
        } else {
            actionBinary = "on";
            actionMultilevel = value;
        }
        
        self.config.targetDevices.forEach(function(el) {
            var vDev = that.controller.findVirtualDeviceById(el);
            
            if (vDev) {
                if (vDev.deviceType === "switchBinary" || vDev.deviceType === "scene" || vDev.deviceType === "swtichMultilevel" && actionMultilevel === null) {
                    vDev.performCommand(actionBinary);
                    console.log(actionBinary, vDev.id);
                } else if (vDev.deviceType === "swtichMultilevel") {
                        vDev.performCommand("exact", actionMultilevel);
                }
            }
        });
    };

    // Setup metric update event listener
    this.controller.devices.toJSON().filter(function(xDev) { return in_array(self.config.sourceDevices, xDev.id)}).on('change:metrics:level', this.handler);
};

BindDevices.prototype.stop = function () {
    this.controller.devices.toJSON().filter(function(xDev) { return in_array(self.config.sourceDevices, xDev.id)}).off('change:metrics:level', this.handler);

    BindDevices.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
