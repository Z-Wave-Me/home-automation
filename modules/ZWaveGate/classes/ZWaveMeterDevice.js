ZWaveMeterDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveMeterDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x32;
    this.zScaleId = scaleId;

    var zwayDeviceScale = zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].data[this.zScaleId];
    this.sensorTypeString = zwayDeviceScale.sensorTypeString;
    this.scaleString = zwayDeviceScale.scaleString;
}

inherits(ZWaveMeterDevice, ZWaveDevice);

ZWaveMeterDevice.prototype.dataPoints = function () {
    var zwayDeviceScale = zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].data[this.zScaleId];
    return [zwayDeviceScale.val.value];
}
