ZWaveDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveDevice.super_.call(this, id, controller);

    this.zDeviceId = zDeviceId;
    this.zInstanceId = zInstanceId;
    this.zCommandClassId = null;
    this.zSubTreeKey = null;

    this.deviceType = null;

    // this.metrics["level"] = null;
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

ZWaveDevice.prototype._dic = function () {
    return zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId];
}

ZWaveDevice.prototype._dics = function () {
    return this._dic().data[this.zSubTreeKey];
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

