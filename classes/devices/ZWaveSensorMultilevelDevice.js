/*** ZWaveSensorMultilevelDevice.js *******************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function ZWaveSensorMultilevelDevice(id, controller, handler) {
    ZWaveSensorMultilevelDevice.super_.call(this, id, controller, handler);

    this.set({
        deviceType: "probe",
        metrics: {
            probeTitle: '',
            scaleTitle: '',
            level: '',
            icon: '',
            title: 'Sensor'
        }
    });
}

inherits(ZWaveSensorMultilevelDevice, VirtualDevice);
