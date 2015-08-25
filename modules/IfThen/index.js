/*** IfThen Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Niels Roche <nir@zwave.eu>
Description:
    Bind actions on one device to other devices or scenes
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function IfThen (id, controller) {
    // Call superconstructor first (AutomationModule)
    IfThen.super_.call(this, id, controller);
}

inherits(IfThen, AutomationModule);

_module = IfThen;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

IfThen.prototype.init = function (config) {
    IfThen.super_.prototype.init.call(this, config);

    var self = this;

    this.handlerLevel = function (sDev) {
        var that = self,
            value = sDev.get("metrics:level");

        if(value === self.config.sourceDevice.status){
            self.config.targets.forEach(function(el) {
                var id = el[el.filter].target,
                    lvl = el[el.filter].status,
                    vDev = that.controller.devices.get(id);
                
                if (vDev) {
                    if (vDev.get("deviceType") === el.filter && el.filter === "switchMultilevel") {
                        vDev.performCommand("exact", { level: lvl });
                    } else if (vDev.get("deviceType") === "toggleButton" && el.filter === "scene") {
                        vDev.performCommand("on");
                    } else if (vDev.get("deviceType") === el.filter) {
                        vDev.performCommand(lvl);
                    }
                }
            });
        }
    };

    // Setup metric update event listener
    self.controller.devices.on(self.config.sourceDevice.device, 'change:metrics:level', self.handlerLevel);

};

IfThen.prototype.stop = function () {
    var self = this;
    
    // remove event listener
    self.controller.devices.off(self.config.sourceDevice.device, 'change:metrics:level', self.handlerLevel);

    IfThen.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
