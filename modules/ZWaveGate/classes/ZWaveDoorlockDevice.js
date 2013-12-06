/*** ZWaveDoorlockDevice.js ***************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveDoorlockDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveDoorlockDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x62;

    this.deviceType = "doorlock";

    this.widgetClass = "DoorlockWidget";

    this.setMetricValue("mode", this._dic().data.mode.value);
}

inherits(ZWaveDoorlockDevice, ZWaveDevice);

ZWaveDoorlockDevice.prototype.deviceTitle = function () {
    return "Doorlock";
}

ZWaveDoorlockDevice.prototype.bindToDatapoints = function () {
    var self = this;

    this.bindAndRemember(this._dic().data.mode, function (changeType, args) {
        // Handle only "update" and "phantom update" events
        if (0x01 != changeType && 0x40 != changeType) return;

        // Handle update event
        self.setMetricValue("mode", this.value);
        self.controller.emit('zway.dataUpdate', self.zDeviceId, self.zInstanceId, self.zCommandClassId, "mode", this.value);
    });
};

ZWaveDoorlockDevice.prototype.performCommand = function (command) {
    var handled = false;

    console.log("--- ZWaveDoorlockDevice.performCommand processing...", command);

    handled = true;
    if ("open" === command) {
        zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].Set(0);
    } else if ("close" === command) {
        zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].Set(255);
    } else {
        handled = false;
    }

    return handled ? true : ZWaveDoorlockDevice.super_.prototype.performCommand.call(this, command);
}


ZWaveDoorlockDevice.prototype.deviceIconBase = function () {
    return "door";
}

