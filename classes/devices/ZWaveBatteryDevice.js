/*** ZWaveBatteryDevice.js ****************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function ZWaveBatteryDevice(id, controller, handler) {
    ZWaveBatteryDevice.super_.call(this, id, controller, handler);

    this.setMetricValue("probeTitle", "Battery");
    this.setMetricValue("scaleTitle", "%");
    this.setMetricValue("level", "");
    this.setMetricValue("icon", "battery");
    this.setMetricValue("title", "Battery");
    this.set({deviceType: "battery"});
}

inherits(ZWaveBatteryDevice, VirtualDevice);
