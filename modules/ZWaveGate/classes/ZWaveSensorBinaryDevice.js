ZWaveSensorBinaryDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveSensorBinaryDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x30;
}

inherits(ZWaveSensorBinaryDevice, ZWaveDevice);

ZWaveSensorBinaryDevice.prototype.dataPoints = function () {
    var zwayDevice = zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId];
    return [zwayDevice.data.level];
}
