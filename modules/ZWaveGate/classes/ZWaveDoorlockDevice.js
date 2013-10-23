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

    this.widgetClass = "SwitchWidget";

    this.setMetricValue("level", this._dic().data.mode.value);
}

inherits(ZWaveDoorlockDevice, ZWaveDevice);

ZWaveDoorlockDevice.prototype.defaultDeviceName = function () {
    return "Doorlock";
}

// ZWaveDoorlockDevice.prototype.dataPoints = function () {
//     return [this._dic().data.level];
// }

ZWaveDoorlockDevice.prototype.performCommand = function (command) {
    var handled = false;

    console.log("--- ZWaveDoorlockDevice.performCommand processing...");

    handled = true;
    if ("open" === command) {
        zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].Set(255);
    } else if ("close" === command) {
        zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].Set(0);
    } else {
        handled = false;
    }

    return handled ? true : ZWaveDoorlockDevice.super_.prototype.performCommand.call(this, command);
}
