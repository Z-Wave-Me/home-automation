/*** TamperAutoOff Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2016
-----------------------------------------------------------------------------
Author: Yurkin Vitaliy <aivs@z-wave.me>
Description:
    Turn Off tamper widget after 30 seconds

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function TamperAutoOff (id, controller) {
    // Call superconstructor first (AutomationModule)
    TamperAutoOff.super_.call(this, id, controller);

    // Create instance variables
    this.timer = null;
};

inherits(TamperAutoOff, AutomationModule);

_module = TamperAutoOff;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

TamperAutoOff.prototype.init = function (config) {
    TamperAutoOff.super_.prototype.init.call(this, config);

    var self = this;

    this.handler = function (vDev) {
        console.log("------",vDev.get("id"), "=", vDev.get("metrics:level"));
        var value = vDev.get("metrics:level");
        
        if ("on" === value || (parseInt(value) && value > 0)) {
            // Device reported "on", set (or reset) timer to new timeout
            if (self.timer) {
                // Timer is set, so we destroy it
                clearTimeout(self.timer);
                self.timer = null;
            }
            // Notice: self.config.timeout set in seconds
            self.timer = setTimeout(function () {
                // Timeout fired, so we send "off" command to the virtual device
                // (every switch device should handle it)
                vDev.set("metrics:level", "off");
                // And clearing out this.timer variable
                self.timer = null;
            }, self.config.timeout*1000);
        } else {
            // Turned off
            if (self.timer) {
                // Timer is set, so we destroy it
                clearTimeout(self.timer);
                self.timer = null;
            }
        }
    };

    this.deviceCreated = function (vDev) {
        if (vDev.get("probeType") === "tamper") {
            self.controller.devices.on(vDev.id, 'change:metrics:level', self.handler);
        }
    }

    this.deviceRemoved = function (vDev) {
        if (vDev.get("probeType") === "tamper") {
            self.controller.devices.off(vDev.id, 'change:metrics:level', self.handler);
        }
    }

    // Bind to event "Added new device" -- > Bind to new device
    this.controller.devices.on('created', this.deviceCreated);   

     // Bind to event "Removed device" --> Unbind device
    this.controller.devices.on('removed', this.deviceRemoved);  

};

TamperAutoOff.prototype.stop = function () {
    TamperAutoOff.super_.prototype.stop.call(this);

    var self = this;

    if (this.timer){
        clearTimeout(this.timer);
    }

    // At stop unbind from all Tampers
    this.controller.devices.forEach(function(device, i, arr) {
        if (device.get("probeType") === "tamper") {
            self.controller.devices.off(device.id, 'change:metrics:level', self.handler);
            console.log("------ unbinded from",device.get("id"));
        }
    });
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
