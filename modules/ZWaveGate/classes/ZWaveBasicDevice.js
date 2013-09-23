/*** ZWaveBasicDevice.js ******************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveBasicDevice = function (id, controller) {
    ZWaveBasicDevice.super_.call(this, id, controller);

    this.deviceType = "system";
}

inherits(ZWaveBasicDevice, ZWaveDevice);

//TODO: Search for the first network controller and bind to it's BasicSets
ZWaveBatteryDevice.prototype.dataPoints = function () {
	return [];
}

// ZWaveBatteryDevice.prototype.bindToDatapoints = function () {
// }
