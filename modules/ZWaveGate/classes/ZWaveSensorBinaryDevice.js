ZWaveSensorBinaryDevice = function (id, controller, zDeviceId, zInstanceId, sensorTypeId) {
    ZWaveSensorBinaryDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x30;
    this.zSubTreeKey = sensorTypeId;

    this.deviceType = "probe";
    
    this.sensorTypeString = this._dics().sensorTypeString.value;

    this.setMetricValue("probeTitle", this.sensorTypeString);

    this.setMetricValue("level", this._dics().level.value);
}

inherits(ZWaveSensorBinaryDevice, ZWaveDevice);

ZWaveSensorBinaryDevice.prototype.dataPoints = function () {
    return [this._dics().level];
}
