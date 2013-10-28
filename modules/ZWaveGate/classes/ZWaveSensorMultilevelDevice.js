/*** ZWaveSensorMultilevelDevice.js *******************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveSensorMultilevelDevice = function (id, controller, zDeviceId, zInstanceId, sensorTypeId) {
    ZWaveSensorMultilevelDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x31;
    this.zSubTreeKey = sensorTypeId;

    this.deviceType = "probe";

    this.widgetClass = "ProbeWidget";

    this.sensorTypeString = this._dics().sensorTypeString.value;
    this.scaleString = this._dics().scaleString.value;

    this.setMetricValue("probeTitle", this.sensorTypeString);
    this.setMetricValue("scaleTitle", this.scaleString);

    this.setMetricValue("level", this._dics().val.value);
}

inherits(ZWaveSensorMultilevelDevice, ZWaveDevice);

ZWaveSensorMultilevelDevice.prototype.deviceTitle = function () {
    return this.sensorTypeString+" Sensor";
}

ZWaveSensorMultilevelDevice.prototype.dataPoints = function () {
    return [this._dics().val];
}