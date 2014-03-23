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

    this._dataPointBindings = [];
}

inherits(ZWaveDevice, VirtualDevice);

ZWaveDevice.prototype.destroy = function () {
    console.log("--- ZWaveDevice destroy("+this.id+")");
    ZWaveDevice.super_.prototype.destroy.call(this);

    this.unbindDataPoints();
};

ZWaveDevice.prototype.unbindDataPoints = function () {
    console.log("--- ZWaveDevice unbindDataPoints("+this.id+")");
    this._dataPointBindings.forEach(function (binding) {
        // console.log("--- UNBIND", binding);
        binding[0].unbind[binding[1]];
    });
};

ZWaveDevice.prototype.bindAndRemember = function (dataPoint, func) {
    this._dataPointBindings.push([dataPoint, dataPoint.bind(func)]);
};

ZWaveDevice.prototype.deviceIconBase = function () {
    return "zwave";
}

ZWaveDevice.prototype.dataPoints = function () {
    return [];
}

ZWaveDevice.prototype.bindToDatapoints = function () {
    var self = this;
    var _dpList = this.dataPoints();

    console.log("VirtualDevice", this.id, "binding to", _dpList.length, "datapoints");

    _dpList.forEach(function (dataPoint) {
        var dpRec = [dataPoint, dataPoint.bind(function (changeType, args) {
            // Handle only "update" and "shadow update" events
            if (0x01 != changeType && 0x41 != changeType) return;

            // Emit generic event
            self.controller.emit('zway.dataUpdate', self.zDeviceId, self.zInstanceId, self.zCommandClassId, self.zSubTreeKey, this.value, args);

            // Handle update event
            self.handleDatapointUpdate(this.value, args);
        })];
        self._dataPointBindings.push(dpRec);
    });
};

ZWaveDevice.prototype.handleDatapointUpdate = function (value, args) {
    this.setMetricValue("level", value);
}

ZWaveDevice.prototype._di = function () {
    return zway.devices[this.zDeviceId].instances[this.zInstanceId];
}

ZWaveDevice.prototype._dic = function (commandClassId) {
    return zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[!!commandClassId ? commandClassId : this.zCommandClassId];
}

ZWaveDevice.prototype._dics = function () {
    return this._dic().data[this.zSubTreeKey];
}

ZWaveDevice.prototype._subTreeKeys = function (commandClassId) {
    var res = [];

    Object.keys(this._dic(commandClassId).data).forEach(function (key) {
        var _k = parseInt(key, 10);
        if (!isNaN(_k)) {
            res.push(_k);
        }
    });

    return res;
}

ZWaveDevice.prototype.performCommand = function (command) {
    console.log("--- ZWaveDevice.performCommand processing...");

    var handled = true;
    if ("update" === command) {
        zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].Get();
    } else {
        handled = false;
    }

    return handled ? true : ZWaveDevice.super_.prototype.performCommand.call(this, command);
}

