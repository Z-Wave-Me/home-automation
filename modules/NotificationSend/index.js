/*** NotificationSend Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2020
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
	Send a custom notification
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function NotificationSend(id, controller) {
	// Call superconstructor first (AutomationModule)
	NotificationSend.super_.call(this, id, controller);
}

inherits(NotificationSend, AutomationModule);

_module = NotificationSend;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

NotificationSend.prototype.init = function(config) {
	NotificationSend.super_.prototype.init.call(this, config);

	var self = this;

	this.vDev = this.controller.devices.create({
		deviceId: this.getName() + "_" + this.id,
		defaults: {
			deviceType: "toggleButton",
			metrics: {
				level: "on", // it is always on, but usefull to allow bind
				icon: "/ZAutomation/api/v1/load/modulemedia/" + this.getName() + "/icon.png",
				title: this.getInstanceTitle()
			}
		},
		overlay: {},
		handler: function(command) {
			if (command !== 'on') return;
			
			if (self.config.recipient_type === "user") {
				self.controller.notificationUserChannelsSend(self.config.user, self.config.message);
			} else if (self.config.recipient_type === "channel") {
				self.controller.notificationChannelSend(self.config.channel, self.config.message);
			} else {
				self.controller.notificationAllChannelsSend(self.config.message);
			}

			// update on ourself to allow catch this event
			self.vDev.set("metrics:level", "on");
		},
		moduleId: this.id
	});
};

NotificationSend.prototype.stop = function() {
	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
		this.vDev = null;
	}

	Scenes.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------