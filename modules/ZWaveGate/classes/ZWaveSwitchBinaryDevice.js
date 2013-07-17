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

ZWaveSwitchBinaryDevice.prototype.performCommand = function (command) {
    var handled = ZWaveSwitchBinaryDevice.super_.prototype.performCommand.call(this, command);

    // Stop command processing due to parent class already processed it
    if (handled) return handled;

    console.log("--- ZWaveSwitchBinaryDevice.performCommand continuing processing...");

    handled = true;
    if ("on" === command) {
        zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].Set(255);
    } else if ("off" === command) {
        zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].Set(0);
    } else {
        handled = false;
    }

    return handled;
}
