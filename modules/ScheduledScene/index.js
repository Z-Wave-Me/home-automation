/*** ScheduledScene Z-Way HA module *******************************************

Version: 2.2
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>, Niels Roche <nir@zwave.eu>, Yurkin Vitaliy <aivs@z-wave.me>
Description:
	This executes scene by cron

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function ScheduledScene (id, controller) {
	// Call superconstructor first (AutomationModule)
	ScheduledScene.super_.call(this, id, controller);
}

inherits(ScheduledScene, AutomationModule);

_module = ScheduledScene;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

ScheduledScene.prototype.init = function (config) {
	ScheduledScene.super_.prototype.init.call(this, config);

	var self = this;

	this.runScene = function() {
		var switchesArray;
		if (_.isArray(self.config.devices.switches)) {
			switchesArray = self.config.devices.switches;
		}
		// compatibility configuration to version 2.2
		if (_.isArray(self.config.switches)) {
			switchesArray = self.config.switches;
		}

		if (switchesArray) {
			switchesArray.forEach(function(devState) {
				var vDev = self.controller.devices.get(devState.device);
				if (vDev) {
					if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
						vDev.performCommand(devState.status);
					}
				}
			});
		}

		var thermostatsArray;
		if (_.isArray(self.config.devices.thermostats)) {
			thermostatsArray = self.config.devices.thermostats;
		}
		// compatibility configuration to version 2.2
		if (_.isArray(self.config.thermostats)) {
			thermostatsArray = self.config.thermostats;
		}

		if (thermostatsArray) {
			thermostatsArray.forEach(function(devState) {
				var vDev = self.controller.devices.get(devState.device);
				if (vDev) {
					if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
						vDev.performCommand("exact", { level: devState.status });
					}
				}
			});
		}

		var dimmersArray;
		if (_.isArray(self.config.devices.dimmers)) {
			dimmersArray = self.config.devices.dimmers;
		}
		// compatibility configuration to version 2.2
		if (_.isArray(self.config.devices.dimmers)) {
			dimmersArray = self.config.dimmers;
		}

		if (dimmersArray) {
			dimmersArray.forEach(function(devState) {
				var vDev = self.controller.devices.get(devState.device);
				if (vDev) {
					if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
						vDev.performCommand("exact", { level: devState.status });
					}
				}
			});
		}

		var locksArray;
		if (_.isArray(self.config.devices.locks)) {
			locksArray = self.config.devices.locks;
		}
		// compatibility configuration to version 2.2
		if (_.isArray(self.config.devices.locks)) {
			locksArray = self.config.locks;
		}

		if (locksArray) {
			locksArray.forEach(function(devState) {
				var vDev = self.controller.devices.get(devState.device);
				if (vDev) {
					if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
						vDev.performCommand(devState.status);
					}
				}
			});
		}

		var scenesArray;
		if (_.isArray(self.config.devices.scenes)) {
			scenesArray = self.config.devices.scenes;
		}
		// compatibility configuration to version 2.2
		if (_.isArray(self.config.devices.scenes)) {
			scenesArray = self.config.scenes;
		}

		if (scenesArray) {
			scenesArray.forEach(function(scene) {
				var vDev = self.controller.devices.get(scene);
				if (vDev) {
					vDev.performCommand("on");
				}
			});
		}
	};

	// set up cron handler
	this.controller.on("scheduledScene.run."+self.id, this.runScene);

	// add cron schedule
	var wds = this.config.weekdays.map(function(x) { return parseInt(x, 10); });
	
	if (wds.length == 7) {
		wds = [null]; // same as all - hack to add single cron record. NB! changes type of wd elements from integer to null
	}

	wds.forEach(function(wd) {
		if (_.isArray(self.config.times)) {
			self.config.times.forEach(function(time) {
				self.controller.emit("cron.addTask", "scheduledScene.run."+self.id, {
					minute: parseInt(time.split(":")[1], 10),
					hour: parseInt(time.split(":")[0], 10),
					weekDay: wd,
					day: null,
					month: null
				});
			});
		}
		// compatibility configuration to version 2.2
		else {
			self.controller.emit("cron.addTask", "scheduledScene.run."+self.id, {
				minute: parseInt(self.config.time.split(":")[1], 10),
				hour: parseInt(self.config.time.split(":")[0], 10),
				weekDay: wd,
				day: null,
				month: null
			});
		}
	});
};

ScheduledScene.prototype.stop = function () {
	ScheduledScene.super_.prototype.stop.call(this);

	this.controller.emit("cron.removeTask", "scheduledScene.run."+this.id);
	this.controller.off("scheduledScene.run."+this.id, this.runScene);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
