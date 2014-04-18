/*** ZWaveBatteryDevice.js ****************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveBatteryDevice = function (id, controller) {
    ZWaveBatteryDevice.super_.call(this, id, controller);

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
