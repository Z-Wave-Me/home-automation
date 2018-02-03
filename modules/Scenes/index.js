/*** Scenes Z-Way HA module *******************************************

Version: 1.1.2
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Changed: Michael Hensche <mh@zwave.eu>
Changed: Hans-Christian Göckeritz <hcg@zwave.eu>
Description:
	Implements light scene based on virtual devices of type dimmer, switch or anothe scene
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Scenes (id, controller) {
	// Call superconstructor first (AutomationModule)
	Scenes.super_.call(this, id, controller);
}

inherits(Scenes, AutomationModule);

_module = Scenes;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Scenes.prototype.init = function (config) {
	Scenes.super_.prototype.init.call(this, config);

	var self = this;

	this.vDev = this.controller.devices.create({
		deviceId: "Scenes_" + this.id,
		defaults: {
			deviceType: "toggleButton",
			customIcons: { 
				"default": self.config.customIcon.table[0].icon
			},
			metrics: {
				level: "on", // it is always on, but usefull to allow bind
				icon: "scene",
				title: self.getInstanceTitle()
			}
		},
		overlay: {},
		handler: function (command) {
			if (command !== 'on') return;

			self.config.devices.switches.forEach(function(devState) {
				var vDev = self.controller.devices.get(devState.device);
				if (vDev) {
					if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
						vDev.performCommand(devState.status);
					}
				}
			});
			self.config.devices.thermostats.forEach(function(devState) {
				var vDev = self.controller.devices.get(devState.device);
				if (vDev) {
					if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
						vDev.performCommand("exact", { level: devState.status });
					}
				}
			});
			self.config.devices.dimmers.forEach(function(devState) {
				var vDev = self.controller.devices.get(devState.device);
				if (vDev) {
					if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
						vDev.performCommand("exact", { level: devState.status });
					}
				}
			});
			self.config.devices.locks.forEach(function(devState) {
				var vDev = self.controller.devices.get(devState.device);
				if (vDev) {
					if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
						vDev.performCommand(devState.status);
					}
				}
			});
			self.config.devices.scenes.forEach(function(scene) {
				var vDev = self.controller.devices.get(scene);
				if (vDev) {
					vDev.performCommand("on");
				}
			});

			self.vDev.set("metrics:level", "on"); // update on ourself to allow catch this event
		},
		moduleId: this.id
	});
};

Scenes.prototype.stop = function () {
	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
		this.vDev = null;
	}

	Scenes.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
