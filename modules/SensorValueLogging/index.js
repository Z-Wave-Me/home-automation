/*** SensorValueLogging Z-Way Home Automation module *************************************

 Version: 1.0.1
 (c) Z-Wave.Me, 2014

 -----------------------------------------------------------------------------
 Author: Poltorak Serguei <ps@z-wave.me>
 Description:
     Log sensor value in JSON file

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SensorValueLogging (id, controller) {
    // Call superconstructor first (AutomationModule)
    SensorValueLogging.super_.call(this, id, controller);
};

inherits(SensorValueLogging, AutomationModule);

_module = SensorValueLogging;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SensorValueLogging.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    SensorValueLogging.super_.prototype.init.call(this, config);

    var device = this.controller.findVirtualDeviceById(this.config.device);

    // Check if device is a switch
    if ("proble" !== device.deviceType && "sensor" !== device.deviceType) {
        // Exit initializer due to invalid device type
        console.log("ERROR", "SensorValueLogging Device", this.config.device, "isn't a sensor", "(" + device.deviceType + ").");
        return;
    }

    // Remember "this" for detached callbacks (such as event listener callbacks)
    var self = this;

    this.handler = function (deviceId, metric, value) {
        if (self.config.device === deviceId && "level" === metric) {
            var storedLog = loadObject("SensorValueLogging-" + self.id);
            if (!storedLog) {
                storedLog = [];
            storedLog.push({"deviceId": deviceId, "time": Date.now(), "value": value});
            storeObject("SensorValueLogging-" + self.id);
            storedLog = null;
        }
    };

    // Setup metric update event listener
    this.controller.on('device.metricUpdated', this.handler);
};

SensorValueLogging.prototype.stop = function () {
    SensorValueLogging.super_.prototype.stop.call(this);

    if (this.handler)
        this.controller.off('device.metricUpdated', this.handler);
};
// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// This module doesn't have any additional methods
