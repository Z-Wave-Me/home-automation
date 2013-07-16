ZWaveBatteryDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveBatteryDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x80;
}

inherits(ZWaveBatteryDevice, ZWaveDevice);

ZWaveBatteryDevice.prototype.dataPoints = function () {
    var zwayDevice = zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId];
    return [zwayDevice.data.last];
}
