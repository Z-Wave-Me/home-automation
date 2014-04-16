/*** ZWaveMeterDevice.js ******************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveMeterDevice = function (id, controller, zDeviceId, zInstanceId, zScaleId) {
    ZWaveMeterDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.deviceType = "probe";

    this.setMetricValue("probeTitle", "");
    this.setMetricValue("scaleTitle", "");
    this.setMetricValue("level", "");
    this.setMetricValue("title", "Probe");
}

inherits(ZWaveMeterDevice, VirtualDevice);
