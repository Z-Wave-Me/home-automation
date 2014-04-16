/*** ZWaveSwitchBinaryDevice.js ***********************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function ZWaveSwitchBinaryDevice(id, controller, handler) {
    ZWaveSwitchBinaryDevice.super_.call(this, id, controller, handler);

    this.deviceType = "switchBinary";

    this.setMetricValue("level", "");
    this.setMetricValue("icon", "");
    this.setMetricValue("title", "Switch");
    this.set({deviceType: "switchBinary"});
}

inherits(ZWaveSwitchBinaryDevice, VirtualDevice);
