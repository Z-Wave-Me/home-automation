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
