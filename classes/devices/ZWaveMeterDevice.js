/*** ZWaveMeterDevice.js ******************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveMeterDevice = function (id, controller, zDeviceId, zInstanceId, zScaleId) {
    ZWaveMeterDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.set({
        deviceType: 'probe',
        probeTitle: '',
        scaleTitle: '',
        level: '',
        title: 'Probe'
    });
}

inherits(ZWaveMeterDevice, VirtualDevice);
