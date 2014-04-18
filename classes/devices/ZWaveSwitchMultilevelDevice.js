/*** ZWaveSwitchMultilevelDevice.js *******************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function ZWaveSwitchMultilevelDevice(id, controller, handler) {
    ZWaveSwitchMultilevelDevice.super_.call(this, id, controller, handler);

    this.set({
        deviceType: "switchMultilevel",
        metrics: {
            probeTitle: '',
            scaleTitle: '',
            level: '',
            icon: '',
            title: 'Dimmer'
        }
    });
}

inherits(ZWaveSwitchMultilevelDevice, VirtualDevice);
