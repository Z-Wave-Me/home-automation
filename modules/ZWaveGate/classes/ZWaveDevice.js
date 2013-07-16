ZWaveDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveDevice.super_.call(this, id, controller);

    this.zDeviceId = zDeviceId;
    this.zInstanceId = zInstanceId;
    this.zCommandClassId = null;
    this.zScaleId = null;
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
            // Handle only "update" and "shawdow update" events
            if (0x01 != changeType && 0x41 != changeType) return;

            // Emit generic event
            self.controller.emit('zway.dataUpdate', self.zDeviceId, self.zInstanceId, self.zCommandClassId, self.zScaleId, this.value, args);

            // Handle update event
            self.handleDatapointUpdate(this.value, args);
        });
    });
};

ZWaveDevice.prototype.handleDatapointUpdate = function (value, args) {
    this.setMetricValue("level", value);
}
