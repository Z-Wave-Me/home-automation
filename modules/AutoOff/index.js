/******************************************************************************

 AutoOff Z-Way Home Automation module
 Version: 1.0.0
 (c) Z-Wave.Me, 2013

 -----------------------------------------------------------------------------
 Author: Gregory Sitnin <sitnin@z-wave.me>
 Description:
     This module listens given VirtualDevice (which MUSt be typed as switch)
     level metric update events and switches off device after configured
     timeout if this device has been switched on.

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function AutoOff (id, controller) {
    // Call superconstructor first (AutomationModule)
    AutoOff.super_.call(this, id, controller);

    // Create instance variables
    this.timer = null;
}

inherits(AutoOff, AutomationModule);

_module = AutoOff;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

AutoOff.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    AutoOff.super_.prototype.init.call(this, config);

    // Check VirtualDevice existence
    if (!this.controller.devices.hasOwnProperty(this.config.device)) {
        // Exit initializer due to lack of the device
        console.log("ERROR", "AutoOff Device", this.config.device, "doesn't exist.");
        return;
    }

    var device = this.controller.devices[this.config.device];

    // Check if device is a switch
    if ("switch" !== device.deviceType) {
        // Exit initializer due to invalid device type
        console.log("ERROR", "AutoOff Device", this.config.device, "isn't switch", "("+device.deviceType+").");
        return;
    }

    // Remember "this" for detached callbacks (such as event listener callbacks)
    var self = this;

    // Setup metric update event listener
    this.controller.on('device.metricUpdated', function (deviceId, metric, value) {
        if (self.config.device === deviceId && "level" === metric) {
            if (self.timer) {
                // Timer is set, so we destroy it
                clearTimeout(self.timer);
            }
            if (255 === value) {
                // Device reported "on", set (or reset) timer to new timeout
                // Notice: self.config.timeout set in seconds
                self.timer = setTimeout(function () {
                    // Timeout fired, so we send "off" command to the virtual device
                    // (every switch device should handle it)
                    self.controller.devices[deviceId].performCommand("off");
                    // And clearing out this.timer variable
                    self.timer = null;
                }, self.config.timeout*1000);
            }
        }
    });
};

AutoOff.prototype.stop = function () {
    console.log("--- AutoOff.stop()");
    AutoOff.super_.prototype.stop.call(this);

    clearInterval(this.timer);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// This module doesn't have any additional methods
