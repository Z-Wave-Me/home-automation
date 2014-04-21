/*** AutoOff Z-Way Home Automation module *************************************

 Version: 1.0.1
 (c) Z-Wave.Me, 2014

 -----------------------------------------------------------------------------
 Author: Gregory Sitnin <sitnin@z-wave.me> and Poltorak Serguei <ps@z-wave.me>
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
};

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

    this.vDev = this.controller.findVirtualDeviceById(this.config.device);

    // Check if device is a switch
    if ("switchBinary" !== this.vDev.deviceType && "switchMultilevel" !== this.vDev.deviceType) {
        // Exit initializer due to invalid device type
        console.log("ERROR", "AutoOff Device", this.config.device, "isn't switch", "(" + this.vDev.deviceType + ").");
        return;
    }

    // Remember "this" for detached callbacks (such as event listener callbacks)
    var self = this;

    this.handler = function (vDev) {
        if (self.timer) {
            // Timer is set, so we destroy it
            clearTimeout(self.timer);
        }
        if (true === value || 255 === value) {
            // Device reported "on", set (or reset) timer to new timeout
            // Notice: self.config.timeout set in seconds
            self.timer = setTimeout(function () {
                // Timeout fired, so we send "off" command to the virtual device
                // (every switch device should handle it)
                vDev.performCommand("off");
                // And clearing out this.timer variable
                self.timer = null;
            }, self.config.timeout*1000);
        }
    };

    // Setup metric update event listener
    this.vDev.on('change:metrics:level', this.handler);
};

AutoOff.prototype.stop = function () {
    AutoOff.super_.prototype.stop.call(this);

    if (this.timer)
        clearInterval(this.timer);
    
    if (this.handler)
        this.vDev.off('change:metrics:level', this.handler);
};
// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// This module doesn't have any additional methods
