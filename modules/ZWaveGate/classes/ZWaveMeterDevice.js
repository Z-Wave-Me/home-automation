ZWaveMeterDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveMeterDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x32;
    this.zScaleId = scaleId;

    this.deviceType = "probe";

    this.sensorTypeString = this._dics().sensorTypeString.value;
    this.scaleString = this._dics().scaleString.value;

    this.setMetricValue("probeTitle", this.sensorTypeString);
    this.setMetricValue("scaleTitle", this.scaleString);

    this.setMetricValue("level", this._dics().val);
}

inherits(ZWaveMeterDevice, ZWaveDevice);

ZWaveMeterDevice.prototype.dataPoints = function () {
    return [this._dics().val];
}
