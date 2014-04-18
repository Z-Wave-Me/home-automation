/*** ZWaveBatteryDevice.js ****************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function ZWaveBatteryDevice(id, controller, handler) {
    ZWaveBatteryDevice.super_.call(this, id, controller, handler);

    this.set({
        deviceType: 'battery',
        metrics: {
            probeTitle: 'Battery',
            scaleTitle: '%',
            level: '',
            icon: 'battery',
            title: 'Battery'
        }
    });
}

inherits(ZWaveBatteryDevice, VirtualDevice);
