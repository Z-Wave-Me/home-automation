/*** ZWaveMeterDevice.js ******************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function ZWaveMeterDevice(id, controller, handler) {
    ZWaveMeterDevice.super_.call(this, id, controller, handler);

    this.setMetricValue("probeTitle", "");
    this.setMetricValue("scaleTitle", "");
    this.setMetricValue("level", "");
    this.setMetricValue("title", "Probe");
    this.set({deviceType: "probe"});
}

inherits(ZWaveMeterDevice, VirtualDevice);
