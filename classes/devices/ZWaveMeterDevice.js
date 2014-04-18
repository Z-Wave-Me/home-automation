/*** ZWaveMeterDevice.js ******************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function ZWaveMeterDevice(id, controller, handler) {
    ZWaveMeterDevice.super_.call(this, id, controller, handler);

    this.set({
        deviceType: 'probe',
        probeTitle: '',
        scaleTitle: '',
        level: '',
        title: 'Probe'
    });
}

inherits(ZWaveMeterDevice, VirtualDevice);
