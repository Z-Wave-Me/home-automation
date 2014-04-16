/*** ZWaveSensorMultilevelDevice.js *******************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveSensorMultilevelDevice = function (id, controller, zDeviceId, zInstanceId, sensorTypeId) {
    ZWaveSensorMultilevelDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.setMetricValue("probeTitle", "");
    this.setMetricValue("scaleTitle", "");
    this.setMetricValue("level", "");
    this.setMetricValue("icon", "");
    this.setMetricValue("title", "Sensor");
    this.set({deviceType: "sensor"});
}

inherits(ZWaveSensorMultilevelDevice, VirtualDevice);
