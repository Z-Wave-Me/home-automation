/*** DoorsPolling Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: James Millar <islipfd19@gmail.com>, modified from Serguei Poltorak <ps@z-wave.me> Sensors Polling module
Description:
    This module periodically requests all doors
    The period MUST be factor of minues, hours or days. No fraction of minute, hour or day is possible.

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function DoorsPolling (id, controller) {
    // Call superconstructor first (AutomationModule)
    DoorsPolling.super_.call(this, id, controller);
}

inherits(DoorsPolling, AutomationModule);

_module = DoorsPolling;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

DoorsPolling.prototype.init = function (config) {
    DoorsPolling.super_.prototype.init.call(this, config);

    var self = this;

    // Here we assume that period is factor of minute and less than hour, or factor of hours and less than day, or factor of days
    var p = Math.round(this.config.period);
    var m = (p < 60) ? [0, 59, p] : 0;
    var h = p >= 24*60 ? 0 : (p/60 >=1 ? [0, 23, Math.round(p/60)] : null);
    var wd = p/24/60 >=1 ? [0, 6, Math.round(p/24/60)] : null;
    var currentPoll, lastPoll, devJSON;
     
    this.controller.emit("cron.addTask", "doorsPolling.poll", {
        minute: m,
        hour: h,
        weekDay: wd,
        day: null,
        month: null
    });

    this.onPoll = function () {

        currentPoll = Math.floor(new Date().getTime() / 1000);

        this.devices.forEach(function(dev) {
            devJSON = this.controller.devices.get(dev.id).toJSON();

            if (devJSON.updateTime <= lastPoll && (dev.get('deviceType') === 'doorlock')){

                var res = dev.id.split("_");
                var nodeId = res[2].split("-")[0];
                var iId = res[2].split("-")[1];
                var ccId = res[2].split("-")[2];

                zway.devices[nodeId].instances[iId].commandClasses[ccId].Get("255");
            }

        });

        lastPoll = currentPoll;
    };
    
    this.controller.on('doorsPolling.poll', this.onPoll);
};

DoorsPolling.prototype.stop = function () {
    DoorsPolling.super_.prototype.stop.call(this);

    this.controller.off('doorsPolling.poll', this.onPoll);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
