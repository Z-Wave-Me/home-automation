/*** ZWaveSensorBinaryDevice.js ***********************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveSensorBinaryDevice = function (id, controller, zDeviceId, zInstanceId, sensorTypeId) {
    ZWaveSensorBinaryDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.set({
        deviceType: 'sensor',
        probeTitle: '',
        icon: '',
        level: '',
        title: 'Sensor'
    });
}

inherits(ZWaveSensorBinaryDevice, VirtualDevice);
