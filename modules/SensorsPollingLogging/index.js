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
	var h = p >= 24*60 ? 0 : (p/60 >=1 ? [0, 23, Math.round(p/60)] : null);
	var wd = p/24/60 >=1 ? [0, 6, Math.round(p/24/60)] : null;
	 
	this.controller.emit("cron.addTask", "sensorsPollingLogging.poll", {
		minute: m,
		hour: h,
		weekDay: wd,
		day: null,
		month: null
	});

	this.handler = function (vDev) {
		if (self.config.logTo === "JSONFile") {
			var storedLog = loadObject("SensorValueLogging_" + vDev.id + "_" + self.id);
			if (!storedLog) {
				storedLog = {
					deviceId: vDev.id,
					deviceName: vDev.get("metrics:title"),
					sensorData: []
				};
			};
			storedLog.sensorData.push({"time": Date.now(), "value": vDev.get("metrics:level")});
			saveObject("SensorValueLogging_" + vDev.id + "_" + self.id, storedLog);
			storedLog = null;
		};
		if (self.config.logTo === "HTTPGET") {
			http.request({
				method: 'GET',
				url: self.config.url.replace("${id}", vDev.id).replace("${value}", vDev.get('metrics:level'))
			});
		};

		// Clear the watchdog timer
		if (self.watchdogtimer)
			clearTimeout (self.watchdogtimer);
		self.watchdogtimer = null;
		vDev.off("change:metrics:level", self.handler);
	};

	this.onPoll = function () {
		self.config.devices.forEach(function(vDevId) {
			var vDev = this.controller.devices.get(vDevId);
			if (vDev) {
				// If the watchdog timer still active, that means that Polling interval is less
				// than watchdog timer. That is bad, but not fatal.
				if (self.watchdogtimer)
				{
					// that will also clean the timer and unsubscribe
					self.handler(vDev);
				} else
				{
					self.watchdogtimer = setTimeout ( function() {self.handler(vDev);}, self.config.polling*1000);
					vDev.on("change:metrics:level",self.handler);
					vDev.performCommand("update");
				};
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
