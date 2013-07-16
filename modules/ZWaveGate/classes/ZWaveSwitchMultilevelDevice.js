ZWaveSwitchMultilevelDevice = function (id, controller, zDeviceId, zInstanceId, scaleId) {
    ZWaveSwitchMultilevelDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x26;
    this.zScaleId = scaleId;
}

inherits(ZWaveSwitchMultilevelDevice, ZWaveDevice);

ZWaveSwitchMultilevelDevice.prototype.dataPoints = function () {
    var zwayDevice = zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId];
    return [zwayDevice.data[this.zScaleId].val];
}
