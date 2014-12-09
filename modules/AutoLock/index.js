/*** AutoLock Z-Way Home Automation module *************************************

 Version: 1.0.0
 (c) Z-Wave.Me, 2014

 -----------------------------------------------------------------------------
 Author: Yurkin Vitaliy <aivs@z-wave.me>
 Description: Door/Window Sensor automatically closes lock when door is closed

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------
function AutoLock (id, controller) {
    // Call superconstructor first (AutomationModule)
    AutoLock.super_.call(this, id, controller);
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
    
    // init value at start
    var lastSensorStatus = "on";

    // handler - it is a name of your function
    this.handler = function (vDev) {
        var nowSensorStatus = vDev.get("metrics:level");
        // Check if sensor is triggered
        if (lastSensorStatus !== nowSensorStatus) {
            console.log("----------------------------- AutoLock", self.config.BinarySensor, "=", nowSensorStatus);
            // Close lock if sensor false
            if (nowSensorStatus === "off") {
                self.controller.devices.get(self.config.DoorLock).performCommand("close");
            }
            lastSensorStatus = nowSensorStatus;
        };
    };

    // Setup metric update event listener
    // device.metricUpdated is a reserved zway word
    this.controller.devices.on(this.config.BinarySensor, 'change:metrics:level', this.handler);
};

AutoLock.prototype.stop = function () {
    AutoLock.super_.prototype.stop.call(this);

    this.controller.devices.off(this.config.BinarySensor, 'change:metrics:level', this.handler);
};
