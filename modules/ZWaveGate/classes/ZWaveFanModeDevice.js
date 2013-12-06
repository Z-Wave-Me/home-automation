/*** ZWaveFanModeDevice.js ****************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveFanModeDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveFanModeDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x44;

    this.deviceType = "fan";

    this.modes = this.assembleModes();
    this.setMetricValue("modes", this.modes);
    this.setMetricValue("currentMode", this._dic().data.mode.value);
    this.setMetricValue("state", this._dic().data.on.value);
}

inherits(ZWaveFanModeDevice, ZWaveDevice);

ZWaveFanModeDevice.prototype.deviceTitle = function () {
    return "Fan";
}

ZWaveFanModeDevice.prototype.bindToDatapoints = function () {
    var self = this;

    this.bindAndRemember(this._dic().data.mode, function (changeType, args) {
        // Handle only "update" and "phantom update" events
        if (0x01 != changeType && 0x40 != changeType) return;
        // Handle update event
        self.setMetricValue("currentMode", this.value);
        // Emit generic event
        self.controller.emit('zway.dataUpdate', self.zDeviceId, self.zInstanceId, self.zCommandClassId, "mode", this.value);
    });

    this.bindAndRemember(this._dic().data.on, function (changeType, args) {
        // Handle only "update" and "phantom update" events
        if (0x01 != changeType && 0x40 != changeType) return;
        // Handle update event
        self.setMetricValue("state", this.value);
        // Emit generic event
        self.controller.emit('zway.dataUpdate', self.zDeviceId, self.zInstanceId, self.zCommandClassId, "on", this.value);
    });
};

ZWaveFanModeDevice.prototype.assembleModes = function () {
    var res = {};
    var treeData = this._dic().data;

    this._subTreeKeys().forEach(function (modeId) {
        res[modeId] = {
            id: modeId,
            title: treeData[modeId].modeName.value
        }
    });

    return res;
}

ZWaveFanModeDevice.prototype.performCommand = function (command, args) {
    console.log("--- ZWaveFanModeDevice.performCommand processing...");

    var handled = true;

    if ("on" === command) {
        this._dic().Set(true, this.metrics.currentMode);
    } else if ("off" === command) {
        this._dic().Set(false, this.metrics.currentMode);
    } else if ("setMode" === command) {
        var _modeId = parseInt(args["mode"], 10);
        if (!isNaN(_modeId)) {
            this._dic().Set(this.metrics.state, _modeId);
        } else {
            handled = false;
            this.controller.emit("core.error", "Invalid mode id ["+_modeId+"]");
        }
    } else {
        handled = false;
    }

    return handled ? true : ZWaveFanModeDevice.super_.prototype.performCommand.call(this, command);
}


ZWaveFanModeDevice.prototype.deviceIconBase = function () {
    return "fan";
}
