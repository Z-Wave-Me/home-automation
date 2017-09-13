/*** BatteryPolling Z-Way HA module *******************************************

Version: 2.1.0
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me> nad Serguei Poltorak <ps@z-wave.me>
Description:
	This module periodically requests all battery devices for battery level report

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function BatteryPolling (id, controller) {
	// Call superconstructor first (AutomationModule)
	BatteryPolling.super_.call(this, id, controller);
}

inherits(BatteryPolling, AutomationModule);

_module = BatteryPolling;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

BatteryPolling.prototype.init = function (config) {
	BatteryPolling.super_.prototype.init.call(this, config);

	var self = this;

	// polling function
	this.onPoll = function () {
		self.controller.devices.filter(function (el) {
			return el.get("deviceType") === "battery" && (el.id != "BatteryPolling_" + self.id);
		}).map(function(el) {
			el.performCommand("update");
		});
	};

	// create vDev
	this.vDev = this.controller.devices.create({
		deviceId: "BatteryPolling_" + this.id,
		defaults: {
			deviceType: "battery",
			metrics: {
				probeTitle: "Battery",
				scaleTitle: "%",
				title: self.getInstanceTitle()
			}
		},
		overlay: {},
		handler: this.onPoll,
		moduleId: this.id
	});

	this.onMetricUpdated = function (vDev) {	  
		if (!vDev || vDev.id === self.vDev.id) {
			return; // prevent infinite loop with updates from itself and allows first fake update
		}
		
		if (vDev.get("deviceType") !== "battery") {
			return;
		}
		
		self.vDev.set("metrics:level", self.minimalBatteryValue());
		if (vDev.get("metrics:level") <= self.config.warningLevel) {
			var values = vDev.get("metrics:title"),
				langFile = self.loadModuleLang();
				
			self.controller.addNotification("warning", langFile.warning + values, "battery", self.vDev.get(id));
		}
	};
	
	// Setup event listeners
	this.controller.devices.on("change:metrics:level", self.onMetricUpdated);

	// set up cron handler
	this.controller.on("batteryPolling.poll", this.onPoll);

	// Every Day is equal -1 in module.json
	var everyDay = -1;
	if (this.config.launchWeekDay == everyDay) {
		// add cron schedule every day
		this.controller.emit("cron.addTask", "batteryPolling.poll", {
			minute: null,
			hour: 0,
			weekDay: null,
			day: null,
			month: null
		});
	}
	else {
		// add cron schedule every week
		this.controller.emit("cron.addTask", "batteryPolling.poll", {
			minute: 0,
			hour: 0,
			weekDay: this.config.launchWeekDay,
			day: null,
			month: null
		});
	}
	
	// run first time to set up the value
	this.onMetricUpdated();
};

BatteryPolling.prototype.stop = function () {
	BatteryPolling.super_.prototype.stop.call(this);

	var self = this;
	
	this.controller.devices.remove(this.vDev.id);
	this.controller.devices.off("change:metrics:level", self.onMetricUpdated);
	this.controller.emit("cron.removeTask", "batteryPolling.poll");
	this.controller.off("batteryPolling.poll", this.onPoll);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

BatteryPolling.prototype.minimalBatteryValue = function () {
	var self = this,
		arr;
   
	arr = this.controller.devices.filter(function(vDev) {
		return vDev.get("deviceType") === "battery" && vDev.id != self.vDev.id;
	}).map(function(vDev) {
		return vDev.get("metrics:level");
	});
	arr.push(100);

	return Math.min.apply(null, arr);
}
