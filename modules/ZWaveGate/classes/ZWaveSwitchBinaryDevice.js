ZWaveSwitchBinaryDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveSwitchBinaryDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x25;

    this.vDevType = "switch";

    this.setMetricValue("level", this._dic().data.level.value);
}

inherits(ZWaveSwitchBinaryDevice, ZWaveDevice);

ZWaveSwitchBinaryDevice.prototype.dataPoints = function () {
    // var zwayDevice = zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId];
    // return [zwayDevice.data.level];
    return [this._dic().data.level];
}
