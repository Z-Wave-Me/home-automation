/*** ZWaveSensorBinaryDevice.js ***********************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function ZWaveSensorBinaryDevice(id, controller, handler) {
    ZWaveSensorBinaryDevice.super_.call(this, id, controller, handler);

    this.deviceType = "sensor";

    this.setMetricValue("probeTitle", "");
    this.setMetricValue("level", "");
    this.setMetricValue("icon", "");
    this.setMetricValue("title", "Sensor");
    this.set({deviceType: "sensor"});
}

inherits(ZWaveSensorBinaryDevice, VirtualDevice);
