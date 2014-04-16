/*** ZWaveSensorMultilevelDevice.js *******************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function ZWaveSensorMultilevelDevice(id, controller, handler) {
    ZWaveSensorMultilevelDevice.super_.call(this, id, controller, handler);

    this.setMetricValue("probeTitle", "");
    this.setMetricValue("scaleTitle", "");
    this.setMetricValue("level", "");
    this.setMetricValue("icon", "");
    this.setMetricValue("title", "Sensor");
    this.set({deviceType: "probe"});
}

inherits(ZWaveSensorMultilevelDevice, VirtualDevice);
