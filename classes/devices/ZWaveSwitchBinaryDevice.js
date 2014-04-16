/*** ZWaveSwitchBinaryDevice.js ***********************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveSwitchBinaryDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveSwitchBinaryDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.deviceType = "switchBinary";

    this.setMetricValue("level", "");
    this.setMetricValue("icon", "");
    this.setMetricValue("title", "Switch");
}

inherits(ZWaveSwitchBinaryDevice, VirtualDevice);

ZWaveSwitchBinaryDevice.prototype.performCommand = function (command) {
    console.log("--- ZWaveSwitchBinaryDevice.performCommand processing...");

    var handled = true;

    if ("on" === command) {
        zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].Set(255);
    } else if ("off" === command) {
        zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId].Set(0);
    } else {
        handled = false;
    }

    return handled ? true : ZWaveSwitchBinaryDevice.super_.prototype.performCommand.call(this, command);
}
