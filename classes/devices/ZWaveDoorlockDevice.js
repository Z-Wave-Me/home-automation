/*** ZWaveDoorlockDevice.js ***************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function ZWaveDoorlockDevice(id, controller, handler) {
    ZWaveDoorlockDevice.super_.call(this, id, controller, handler);

    this.setMetricValue("mode", "");
    this.setMetricValue("icon", "door");
    this.set({
        deviceType: 'doorlock',
        metrics: {
            mode: '',
            icon: 'door',
            title: 'Door Lock'
        }
    });
}

inherits(ZWaveDoorlockDevice, VirtualDevice);
