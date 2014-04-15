/*** ZWaveSwitchMultilevelDevice.js *******************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveSwitchMultilevelDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveSwitchMultilevelDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.deviceType = "switchMultilevel";

    this.setMetricValue("level", "");
    this.setMetricValue("icon", "");
    this.setMetricValue("title", "Dimmer");
}

inherits(ZWaveSwitchMultilevelDevice, VirtualDevice);
