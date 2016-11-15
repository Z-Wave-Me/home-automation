/*** AutoLock Z-Way Home Automation module *************************************

 Version: 1.1.1
 (c) Z-Wave.Me, 2014

 -----------------------------------------------------------------------------
 Author: Yurkin Vitaliy <aivs@z-wave.me>
 Description: Door/Window Sensor automatically closes lock after delay when door is closed

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------
function AutoLock (id, controller) {
    // Call superconstructor first (AutomationModule)
    AutoLock.super_.call(this, id, controller);

    // Create instance variables
    this.timer = null;
};

inherits(AutoLock, AutomationModule);
_module = AutoLock;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------
AutoLock.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    AutoLock.super_.prototype.init.call(this, config);

    var self = this;
    
    // handler - it is a name of your function
    this.handler = function (vDev) {
        var nowSensorStatus = vDev.get("metrics:level");

        console.log("----------------------------- AutoLock", self.config.BinarySensor, "=", nowSensorStatus);

        // Clear delay if door opened
        if (nowSensorStatus === "on") {
            console.log("Clear delay");
            clearTimeout(self.timer);
        }
        
        // Close lock if sensor false
        if (nowSensorStatus === "off") {
            // Start Timer
            console.log("Start delay");
            self.timer = setTimeout(function () {
                // Close lock 
                self.controller.devices.get(self.config.DoorLock).performCommand("close");
                // And clearing out this.timer variable
                self.timer = null;
            }, self.config.delay*1000);
        }
    };

    // Setup metric update event listener
    this.controller.devices.on(this.config.BinarySensor, 'change:metrics:level', this.handler);
};

AutoLock.prototype.stop = function () {
    AutoLock.super_.prototype.stop.call(this);

    if (this.timer)
        clearTimeout(this.timer);

    this.controller.devices.off(this.config.BinarySensor, 'change:metrics:level', this.handler);
};
