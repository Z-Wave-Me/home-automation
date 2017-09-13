/*** SensorValueLogging Z-Way Home Automation module *************************************

 Version: 1.0.1
 (c) Z-Wave.Me, 2014

 -----------------------------------------------------------------------------
 Author: Poltorak Serguei <ps@z-wave.me>
 Description:
	 Log sensor value in JSON file

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SensorValueLogging (id, controller) {
	// Call superconstructor first (AutomationModule)
	SensorValueLogging.super_.call(this, id, controller);
};

inherits(SensorValueLogging, AutomationModule);

_module = SensorValueLogging;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SensorValueLogging.prototype.init = function (config) {
	// Call superclass' init (this will process config argument and so on)
	SensorValueLogging.super_.prototype.init.call(this, config);

	// Remember "this" for detached callbacks (such as event listener callbacks)
	var self = this;

	this.handler = function (vDev) {
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

	// Setup metric update event listener
	this.controller.devices.on(this.config.device, "change:metrics:level", this.handler);
};

SensorValueLogging.prototype.stop = function () {
	SensorValueLogging.super_.prototype.stop.call(this);

	this.controller.devices.off(this.config.device, "change:metrics:level", this.handler);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// This module doesn't have any additional methods
