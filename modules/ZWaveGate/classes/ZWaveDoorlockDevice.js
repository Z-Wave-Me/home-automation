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

