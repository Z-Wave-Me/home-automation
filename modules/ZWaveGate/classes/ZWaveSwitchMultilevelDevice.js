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

ZWaveSwitchMultilevelDevice.prototype.performCommand = function (command) {
    var handled = ZWaveSwitchMultilevelDevice.super_.prototype.performCommand.call(this, command);

    // Stop command processing due to parent class already processed it
    if (handled) return handled;

    console.log("--- ZWaveSwitchMultilevelDevice.performCommand continuing processing...");

    var newVal;
    if ("on" === command) {
        newVal = 255;
    } else if ("off" === command) {
        newVal = 0;
    } else if ("min" === command) {
        newVal = 10;
    } else if ("max" === command) {
        newVal = 99;
    } else if ("increase" === command) {
        newVal = this.metrics.level+10;
        if (0 !== newVal%10) {
            newVal = Math.round(newVal/10)*10;
        }
        if (newVal > 99) newVal = 99;
    } else if ("decrease" === command) {
        newVal = this.metrics.level-10;
        if (newVal < 0) newVal = 0;
        if (0 !== newVal%10) {
            newVal = Math.round(newVal/10)*10;
        }
    }

    if (0 === newVal || !!newVal) {
        this._dic().Set(newVal);
        handled = true;
    }

    return handled;
}
