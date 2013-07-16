ZWaveSensorBinaryDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveSensorBinaryDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x30;

    this.vDevType = "probe";

    this.setMetricValue("level", this._dic().data.level);
}

inherits(ZWaveSensorBinaryDevice, ZWaveDevice);

ZWaveSensorBinaryDevice.prototype.dataPoints = function () {
    return [this._dic().data.level];
}
