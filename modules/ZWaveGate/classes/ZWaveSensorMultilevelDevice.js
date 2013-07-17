ZWaveSensorMultilevelDevice = function (id, controller, zDeviceId, zInstanceId, scaleId) {
    ZWaveSensorMultilevelDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x31;
    this.zScaleId = scaleId;

    this.deviceType = "probe";

    this.sensorTypeString = this._dics().sensorTypeString.value;
    this.scaleString = this._dics().scaleString.value;

    this.setMetricValue("probeTitle", this.sensorTypeString);
    this.setMetricValue("scaleTitle", this.scaleString);

    this.setMetricValue("level", this._dics().val.value);
}

inherits(ZWaveSensorMultilevelDevice, ZWaveDevice);

ZWaveSensorMultilevelDevice.prototype.dataPoints = function () {
    return [this._dics().val];
}
