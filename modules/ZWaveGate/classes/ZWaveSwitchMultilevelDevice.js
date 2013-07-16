ZWaveSwitchMultilevelDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveSwitchMultilevelDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x26;

    this.vDevType = "multilevel";

    this.setMetricValue("level", this._dic().data.level.value);
}

inherits(ZWaveSwitchMultilevelDevice, ZWaveDevice);

ZWaveSwitchMultilevelDevice.prototype.dataPoints = function () {
    // var zwayDeviceScale = zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].data[this.zScaleId];
    return [this._dic().data.level];
}
