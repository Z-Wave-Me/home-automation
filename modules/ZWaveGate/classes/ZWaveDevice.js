/*** Z-Wave Virtual Device abstract class module ******************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

Description: This module is a base class for all Z-Wave virtual device classes

******************************************************************************/

ZWaveDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveDevice.super_.call(this, id, controller);

    this.zDeviceId = zDeviceId;
    this.zInstanceId = zInstanceId;
    this.zCommandClassId = null;
    this.zSubTreeKey = null;

    this.deviceType = null;
    this.deviceSubType = null;
}

inherits(ZWaveDevice, VirtualDevice);

ZWaveDevice.prototype.dataPoints = function () {
    return [];
}

ZWaveDevice.prototype.bindToDatapoints = function () {
    var self = this;

    console.log("VirtualDevice", this.id, "binding to", this.dataPoints().length, "datapoints");

    this.dataPoints().forEach(function (dataPoint) {
        dataPoint.bind(function (changeType, args) {
            // Handle only "update" and "shadow update" events
            if (0x01 != changeType && 0x41 != changeType) return;

            // Emit generic event
            self.controller.emit('zway.dataUpdate', self.zDeviceId, self.zInstanceId, self.zCommandClassId, self.zSubTree, this.value, args);

            // Handle update event
            self.handleDatapointUpdate(this.value, args);
        });
    });
};

ZWaveDevice.prototype.handleDatapointUpdate = function (value, args) {
    this.setMetricValue("level", value);
}

ZWaveDevice.prototype._di = function () {
    return zway.devices[this.zDeviceId].instances[this.zInstanceId];
}

ZWaveDevice.prototype._dic = function () {
    return zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId];
}

ZWaveDevice.prototype._dics = function () {
    return this._dic().data[this.zSubTreeKey];
}

ZWaveDevice.prototype._subTreeKeys = function (commandClassId) {
    var res = [];

    var _dataTree = !!commandClassId ? this._di().commandClasses[commandClassId].data : this._dic().data;

    Object.keys(_dataTree).forEach(function (key) {
        var _k = parseInt(key, 10);
        if (!isNaN(_k)) {
            res.push(_k);
        }
    });

    return res;
}

ZWaveDevice.prototype.performCommand = function (command) {
    var handled = ZWaveDevice.super_.prototype.performCommand.call(this, command);

    // Stop command processing due to parent class already processed it
    if (handled) return handled;

    console.log("--- ZWaveDevice.performCommand continuing processing...");

    if ("update" === command) {
        zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].Get();
        handled = true;
    }

    return handled;
}

