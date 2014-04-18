/*** ZWaveSensorBinaryDevice.js ***********************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function ZWaveSensorBinaryDevice(id, controller, handler) {
    ZWaveSensorBinaryDevice.super_.call(this, id, controller, handler);

    this.set({
        deviceType: 'sensor',
        probeTitle: '',
        icon: '',
        level: '',
        title: 'Sensor'
    });
}

inherits(ZWaveSensorBinaryDevice, VirtualDevice);
