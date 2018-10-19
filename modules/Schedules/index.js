/*** Schedules Z-Way HA module *******************************************

Version: 1.1.0
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>, Niels Roche <nir@zwave.eu>, Yurkin Vitaliy <aivs@z-wave.me>
Author: Hans-Christian Göckeritz <hcg@zwave.eu>
Description:
	This executes scene by cron

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Schedules(id, controller) {
	// Call superconstructor first (AutomationModule)
	Schedules.super_.call(this, id, controller);
}

inherits(Schedules, AutomationModule);

_module = Schedules;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Schedules.prototype.init = function(config) {
	Schedules.super_.prototype.init.call(this, config);

	var self = this;

	this.devices = _.isArray(this.config.devices) ? this.config.devices : [];

	/*old = {
		"switches": [],
		"dimmers": [],
		"thermostats": [],
		"scenes": []
	}*/

	// transform old structure to new
	if (typeof self.config.devices === 'object' && !_.isArray(self.config.devices)) {

		// concat all lists to one
		Object.keys(self.config.devices).forEach(function(key) {
			/* transform each single entry to the new format: switches, thermostats, dimmers, locks, scenes 
				{
				    deviceId: '',
				    deviceType: '',
				    level: '', // color: { r: 0, g: 0, b: 0}, on, off, open, close, color
				    sendAction: true || false >> don't do this if level is already triggered
				}
			*/
			self.config.devices[key].forEach(function(entry) {
				var vDev = null;
				if (entry.device || (key === 'scenes' && entry)) {
					if (key === 'scenes') {
						self.devices.push({
							deviceId: entry,
							deviceType: 'toggleButton',
							level: 'on'
						});
					} else {
						vDev = self.controller.devices.get(entry.device);

						self.devices.push({
							deviceId: entry.device,
							deviceType: vDev ? vDev.get('deviceType') : '',
							level: entry.status && entry.status != 'level' ? entry.status : (entry.status === 'level' && entry.level ? entry.level : 0),
							sendAction: entry.sendAction || false
						});
					}
				}
			});
		});

		// overwrite config devices list
		self.devices = _.uniq(self.devices);
		self.config.devices = self.devices;

		//save into config
		self.saveConfig();
	}

	self.runScene = function() {

		self.devices.forEach(function(el) {
			self.shiftDevice(el);
		});
	};

	// set up cron handler
	self.controller.on("scheduledScene.run." + self.id, self.runScene);

	// add cron schedule
	var wds = self.config.weekdays.map(function(x) {
		return parseInt(x, 10);
	});

	if (wds.length == 7) {
		wds = [null]; // same as all - hack to add single cron record. NB! changes type of wd elements from integer to null
	}

	wds.forEach(function(wd) {
		if (_.isArray(self.config.times)) {
			self.config.times.forEach(function(time) {
				self.controller.emit("cron.addTask", "scheduledScene.run." + self.id, {
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
			self.controller.emit("cron.addTask", "scheduledScene.run." + self.id, {
				minute: parseInt(self.config.time.split(":")[1], 10),
				hour: parseInt(self.config.time.split(":")[0], 10),
				weekDay: wd,
				day: null,
				month: null
			});
		}
	});
};

Schedules.prototype.stop = function() {
	Schedules.super_.prototype.stop.call(this);

	this.controller.emit("cron.removeTask", "scheduledScene.run." + this.id);
	this.controller.off("scheduledScene.run." + this.id, this.runScene);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------