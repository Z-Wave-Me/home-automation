/*** SwitchPolling Z-Way HA module *******************************************

Version: 1.0.1
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: James Millar <islipfd19@gmail.com>
Description:
    This module periodically requests the state of the selected switches
    The period MUST be factor of minues, hours or days. No fraction of minute, hour or day is possible.

    Change Log:
    1.0.1 - moved cron emitter below "controller.on" so that it is called
            correctly when stopped and started.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SwitchPolling (id, controller) {
    // Call superconstructor first (AutomationModule)
    SwitchPolling.super_.call(this, id, controller);
}

inherits(SwitchPolling, AutomationModule);

_module = SwitchPolling;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SwitchPolling.prototype.init = function (config) {
    SwitchPolling.super_.prototype.init.call(this, config);

    var self = this;

    // Here we assume that period is factor of minute and less than hour, or factor of hours and less than day, or factor of days
    var p = Math.round(this.config.period);
    var m = (p < 60) ? [0, 59, p] : 0;
    var h = p >= 24*60 ? 0 : (p/60 >=1 ? [0, 23, Math.round(p/60)] : null);
    var wd = p/24/60 >=1 ? [0, 6, Math.round(p/24/60)] : null;
     
    this.onPoll = function () {
        self.config.devices.forEach(function(vDevId) {
            var vDev = this.controller.devices.get(vDevId);
            
            var res = vDevId.split("_");
            var nodeId = res[1].split(":")[0];
            var iId = res[1].split(":")[1];
            var ccId = res[1].split(":")[2];

            if (vDev){
                zway.devices[nodeId].instances[iId].commandClasses[ccId].Get()
            }
        });
    };
    this.controller.on('switchPolling.poll', this.onPoll);

    this.controller.emit("cron.addTask", "switchPolling.poll", {
        minute: m,
        hour: h,
        weekDay: wd,
        day: null,
        month: null
    });
};

SwitchPolling.prototype.stop = function () {
    SwitchPolling.super_.prototype.stop.call(this);

    this.controller.emit("cron.removeTask", "switchPolling.poll");
    this.controller.off("switchPolling.poll", this.onPoll);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
