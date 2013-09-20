/*** ZWaveThermostatDevice.js *************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveThermostatDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveThermostatDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x44;

    this.deviceType = "climate";
    this.deviceSubType = "thermostat";

    this.modes = this.assembleModes();
    this.setMetricValue("modes", this.modes);
    this.setMetricValue("currentMode", this._dic().data.mode.value);
}

inherits(ZWaveThermostatDevice, ZWaveDevice);

ZWaveThermostatDevice.prototype.bindToDatapoints = function () {
    var self = this;

    // this._dic().data.mode.bind(function (changeType, args) {
    //     // Handle only "update" and "phantom update" events
    //     if (0x01 != changeType && 0x40 != changeType) return;
    //     // Handle update event
    //     self.setMetricValue("currentMode", this.value);
    //     // Emit generic event
    //     self.controller.emit('zway.dataUpdate', self.zDeviceId, self.zInstanceId, self.zCommandClassId, "mode", this.value);
    // });

    // this._dic().data.on.bind(function (changeType, args) {
    //     // Handle only "update" and "phantom update" events
    //     if (0x01 != changeType && 0x40 != changeType) return;
    //     // Handle update event
    //     self.setMetricValue("state", this.value);
    //     // Emit generic event
    //     self.controller.emit('zway.dataUpdate', self.zDeviceId, self.zInstanceId, self.zCommandClassId, "on", this.value);
    // });
};

ZWaveThermostatDevice.prototype.assembleModes = function () {
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
