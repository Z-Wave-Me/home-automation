/*** SensorsPolling Z-Way HA module *******************************************

Version: 1.0.1
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>, Niels Roche <nir@zwave.eu>
Description:
    This module periodically requests all sensors
    The period MUST be factor of minues, hours or days. No fraction of minute, hour or day is possible.

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SensorsPolling (id, controller) {
    // Call superconstructor first (AutomationModule)
    SensorsPolling.super_.call(this, id, controller);
}

inherits(SensorsPolling, AutomationModule);

_module = SensorsPolling;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SensorsPolling.prototype.init = function (config) {
    SensorsPolling.super_.prototype.init.call(this, config);

    var self = this;

    // Here we assume that period is factor of minute and less than hour, or factor of hours and less than day, or factor of days
    var p = Math.round(this.config.period);
    var m = (p < 60) ? [0, 59, p] : 0;
    var h = p >= 24*60 ? 0 : (p/60 >=1 ? [0, 23, Math.round(p/60)] : null);
    var wd = p/24/60 >=1 ? [0, 6, Math.round(p/24/60)] : null;
    var currentPoll, lastPoll, devJSON;
     
    this.controller.emit("cron.addTask", "SensorsPolling.poll", {
        minute: m,
        hour: h,
        weekDay: wd,
        day: null,
        month: null
    });

    this.onPoll = function () {

        var currentPoll = Math.floor(new Date().getTime() / 1000),
            devicesToUpdate = [],
            devJSON;

        //update only binary and multilevel sensors that has no change during the update interval
        devicesToUpdate = self.controller.devices.filter(function (dev) {
            devJSON = dev.toJSON();

            return _.unique(self.config.devices).indexOf(dev.id) === -1 && 
                        devJSON.updateTime <= lastPoll && 
                            (dev.get('deviceType') === 'sensorBinary' || 
                                dev.get('deviceType') === 'sensorMultilevel');
        });

        if (devicesToUpdate.length > 0) {
            devicesToUpdate.forEach(function (dev) {
                dev.performCommand("update");
            });
        }

        lastPoll = currentPoll;
    };
    
    this.controller.on('SensorsPolling.poll', self.onPoll);
};

SensorsPolling.prototype.stop = function () {
    
    this.controller.off('SensorsPolling.poll', this.onPoll);
    this.controller.emit("cron.removeTask", "SensorsPolling.poll");

    SensorsPolling.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
