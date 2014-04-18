/*** ZWaveSwitchBinaryDevice.js ***********************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function ZWaveSwitchBinaryDevice(id, controller, handler) {
    ZWaveSwitchBinaryDevice.super_.call(this, id, controller, handler);

    this.set({
        deviceType: "switchBinary",
        metrics: {
            probeTitle: '',
            scaleTitle: '',
            level: '',
            icon: '',
            title: 'Switch'
        }
    });
}

inherits(ZWaveSwitchBinaryDevice, VirtualDevice);
