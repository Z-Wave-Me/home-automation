/*** Scenes Z-Way HA module *******************************************

Version: 1.2.1
(c) Z-Wave.Me, 2018
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Changed: Michael Hensche <mh@zwave.eu>
Changed: Hans-Christian Göckeritz <hcg@zwave.eu>
Changed: Niels Roche <nir@z-wave.eu>
Changed: Karsten Reichel <kar@z-wave.eu>
Description:
	Implements light scene based on virtual devices of type dimmer, switch or anothe scene
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Scenes(id, controller) {
	// Call superconstructor first (AutomationModule)
	Scenes.super_.call(this, id, controller);
}

inherits(Scenes, AutomationModule);

_module = Scenes;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Scenes.prototype.init = function(config) {
	Scenes.super_.prototype.init.call(this, config);

	var self = this,
		devices = _.isArray(this.config.devices) ? this.config.devices : [];
		notifications = _.isArray(this.config.notifications) ? this.config.notifications : [];

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
						devices.push({
							deviceId: entry,
							deviceType: 'toggleButton',
							level: 'on'
						});
					} else {
						vDev = self.controller.devices.get(entry.device);

						devices.push({
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
		self.config.devices = _.uniq(devices);

		//save into config
		self.saveConfig();
	}

	self.vDev = self.controller.devices.create({
		deviceId: "Scenes_" + self.id,
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
		handler: function(command) {
			if (command !== 'on') return;

			devices.forEach(function(el) {
				self.shiftDevice(el);
			});

			notifications.forEach(function(n) {
				if (n.target && n.target !== '') {
					notificationType = n.target.search('@') > -1 ? 'mail.notification' : 'push.notification';
					notificationMessage = !n.message ? self.getInstanceTitle() : n.message;

					self.addNotification(notificationType, notificationMessage, n.target);
				}
			});

			// update on ourself to allow catch this event
			self.vDev.set("metrics:level", "on");
		},
		moduleId: self.id
	});
};

Scenes.prototype.stop = function() {
	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
		this.vDev = null;
	}

	Scenes.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------