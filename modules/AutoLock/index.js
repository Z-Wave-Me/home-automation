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
    
    // Virtual device name you can find on http://localhost:8083/ZAutomation/api/v1/devices
    this.deviceSensor = this.controller.devices.get(this.config.BinarySensor);
    this.deviceDoorLock = this.controller.devices.get(this.config.DoorLock);

    // init value at start
    var lastSensorStatus = this.deviceSensor.get("metrics:level");

    // handler - it is a name of your function
    this.handler = function (vDev) {
        var nowSensorStatus = self.deviceSensor.get("metrics:level");
        // Check if sensor is triggered
        if (lastSensorStatus !== nowSensorStatus) {
            console.log("----------------------------- AutoLock", self.deviceSensor.id, "=", nowSensorStatus);
            // Close lock if sensor false
            if (nowSensorStatus === "off") {
                //zway.devices[2].instances[0].commandClasses[98].Set(255);
                self.deviceDoorLock.performCommand("close");
            }
            lastSensorStatus = nowSensorStatus;
        };
    };

    // Setup metric update event listener
    // device.metricUpdated is a reserved zway word
    this.deviceSensor.on('change:metrics:level', this.handler);
};

AutoLock.prototype.stop = function () {
    AutoLock.super_.prototype.stop.call(this);

    if (this.handler && this.deviceSensor)
        this.deviceSensor.off('change:metrics:level', this.handler);
};
