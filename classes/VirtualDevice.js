/*** Z-Way HA Virtual Device base class ***************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Copyright: (c) ZWave.Me, 2013

******************************************************************************/

VirtualDevice = function (id, controller) {
    this.id = id;
    this.controller = controller;
    this.deviceType = null;
    this.metrics = {};
};

VirtualDevice.prototype.setMetricValue = function (name, value) {
    this.metrics[name] = value;
    this.controller.emit("device.metricUpdated", this.id, name, value);
};

VirtualDevice.prototype.performCommand = function (command) {
    return false;
};
