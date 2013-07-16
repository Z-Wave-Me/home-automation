ZWaveSensorMultilevelDevice = function (id, controller, zDeviceId, zInstanceId, scaleId) {
    ZWaveSensorMultilevelDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x31;
    this.zScaleId = scaleId;

    var zwayDeviceScale = zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].data[this.zScaleId];
    this.sensorTypeString = zwayDeviceScale.sensorTypeString;
    this.scaleString = zwayDeviceScale.scaleString;
}

inherits(ZWaveSensorMultilevelDevice, ZWaveDevice);

ZWaveSensorMultilevelDevice.prototype.dataPoints = function () {
    var zwayDeviceScale = zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].data[this.zScaleId];
    return [zwayDeviceScale.val];
}
