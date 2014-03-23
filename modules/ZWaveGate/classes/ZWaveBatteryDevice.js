/*** ZWaveBatteryDevice.js ****************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveBatteryDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveBatteryDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x80;

    this.deviceType = "battery";

    this.setMetricValue("probeTitle", "Battery");
    this.setMetricValue("scaleTitle", "%");

    this.setMetricValue("level", this._dic().data.last.value);
}

inherits(ZWaveBatteryDevice, ZWaveDevice);

ZWaveBatteryDevice.prototype.deviceTitle = function () {
    return "Battery ("+this.zDeviceId+")";
}

ZWaveBatteryDevice.prototype.dataPoints = function () {
    // var zwayDevice = zway.devices[this.zDeviceId].instances[this.zInstanceId].commandClasses[this.zCommandClassId];
    return [this._dic().data.last];
}

ZWaveBatteryDevice.prototype.deviceIconBase = function () {
    return "battery";
}
