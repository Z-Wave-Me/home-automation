/*** SensorsPolling Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>
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
     
    this.controller.emit("cron.addTask", "sensorsPolling.poll", {
        minute: m,
        hour: h,
        weekDay: wd,
        day: null,
        month: null
    });

    this.onPoll = function () {
        self.config.devices.forEach(function(vDevId) {
            var vDev = this.controller.devices.get(vDevId);
            
            if (vDev)
                vDev.performCommand("update");
        });
    };
    this.controller.on('sensorsPolling.poll', this.onPoll);
};

SensorsPolling.prototype.stop = function () {
    SensorsPolling.super_.prototype.stop.call(this);

    this.controller.off('sensorsPolling.poll', this.onPoll);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
