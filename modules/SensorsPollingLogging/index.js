/*** SensorsPollingLogging Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Alexey Vinogradov <klirichek@sphinxsearch.com>
Based on SensorsPolling and logging modules of
Author: Serguei Poltorak <ps@z-wave.me>
Description:
    This module periodically request determined sensors
    And log their values into file or remote HTTP.
    Useful, for example, to trace electricity counter
    
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SensorsPollingLogging (id, controller) {
    // Call superconstructor first (AutomationModule)
    SensorsPollingLogging.super_.call(this, id, controller);
}

inherits(SensorsPollingLogging, AutomationModule);

_module = SensorsPollingLogging;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SensorsPollingLogging.prototype.init = function (config) {
    SensorsPollingLogging.super_.prototype.init.call(this, config);

    var self = this;

    // Here we assume that period is factor of minute and less than hour, or factor of hours and less than day, or factor of days
    var p = Math.round(this.config.period);
    var m = (p < 60) ? [0, 59, p] : 0;
    var h = p >= 24*60 ? 0 : (p/60 >=1 ? [0, 59, Math.round(p/60)] : null);
    var wd = p/24/60 >=1 ? [0, 6, Math.round(p/24/60)] : null;
     
    this.controller.emit("cron.addTask", "sensorsPollingLogging.poll", {
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
            {
                vDev.performCommand("update");
                if (self.config.logTo === "JSONFile") {
                    var storedLog = loadObject("SensorValueLogging_" + vDev.id + "_" + self.id);
                    if (!storedLog) {
                        storedLog = {
                            deviceId: vDev.id,
                            deviceName: vDev.get("metrics:title"),
                            sensorData: []
                        };
                    }
                    storedLog.sensorData.push({"time": Date.now(), "value": vDev.get("metrics:level")});
                    saveObject("SensorValueLogging_" + vDev.id + "_" + self.id, storedLog);
                    storedLog = null;
                }
                if (self.config.logTo === "HTTPGET") {
                    http.request({
                        method: 'GET',
                        url: self.config.url.replace("${id}", vDev.id).replace("${value}", vDev.get('metrics:level'))
                    });
                }
            };
        });
    };

    this.controller.on('sensorsPollingLogging.poll', this.onPoll);
};

SensorsPollingLogging.prototype.stop = function () {
    SensorsPollingLogging.super_.prototype.stop.call(this);

    this.controller.off('sensorsPollingLogging.poll', this.onPoll);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
