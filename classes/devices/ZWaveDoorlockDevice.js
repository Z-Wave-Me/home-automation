/*** ZWaveDoorlockDevice.js ***************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveDoorlockDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveDoorlockDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.deviceType = "doorlock";

    this.setMetricValue("mode", "");
    this.setMetricValue("icon", "door");
    this.setMetricValue("Door Lock");
}

inherits(ZWaveDoorlockDevice, VirtualDevice);

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
