/*** ZWaveMeterDevice.js ******************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveMeterDevice = function (id, controller, zDeviceId, zInstanceId, zScaleId) {
    ZWaveMeterDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.zCommandClassId = 0x32;
    this.zSubTreeKey = zScaleId;

    this.deviceType = "probe";

    this.widgetClass = "ProbeWidget";

    this.sensorTypeString = this._dics().sensorTypeString.value;
    this.scaleString = this._dics().scaleString.value;

    this.setMetricValue("probeTitle", this.sensorTypeString);
    this.setMetricValue("scaleTitle", this.scaleString);

    this.setMetricValue("level", this._dics().val.value);
}

inherits(ZWaveMeterDevice, ZWaveDevice);

ZWaveMeterDevice.prototype.deviceTitle = function () {
    return this.sensorTypeString+" Probe";
}

ZWaveMeterDevice.prototype.dataPoints = function () {
    return [this._dics().val];
}
