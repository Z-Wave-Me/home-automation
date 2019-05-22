/*** NotificationSMSru Z-Way HA module *******************************************

Version: 1.2.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
	This module allows to send notifications via SMS.ru proxy.
	Also creates scene to send specific messages.

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function NotificationSMSru (id, controller) {
	// Call superconstructor first (AutomationModule)
	NotificationSMSru.super_.call(this, id, controller);
}

inherits(NotificationSMSru, AutomationModule);

_module = NotificationSMSru;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

NotificationSMSru.prototype.init = function (config) {
	NotificationSMSru.super_.prototype.init.call(this, config);

	var self = this;

	// handle automatic notifications send
	this.handler = this.onNotificationHandler(config);
	
	this.api_key = config.api_key.toString();
	this.phone = config.phone.toString();
	this.prefix = config.prefix.toString();

	this.controller.on('notifications.push', this.handler);

	// handle manual send
	this.vDev = this.controller.devices.create({
		deviceId: "NotificationSMSru_" + this.id,
		defaults: {
			metrics: {
				level: 'on',
				title: self.getInstanceTitle(this.id),
				icon: "/ZAutomation/api/v1/load/modulemedia/NotificationSMSru/icon.png",
				message: ""
			}
		},
		overlay: {
			deviceType: 'toggleButton'
		},
		handler: function(command, args) {
			if (command === 'on' && args.message) {
				http.request({
					method: 'POST',
					url: "http://sms.ru/sms/send",
					data: {
						api_id: self.api_key,
						to: self.phone,
						text: self.prefix + " " + args.message
					}
				});
			}
			
			self.vDev.set("metrics:level", "on"); // update on ourself to allow catch this event
		},
		moduleId: this.id
	});

	if (config.hide === true) {
		this.vDev.set('visibility', false, { silent: true });
	} else {
		this.vDev.set('visibility', true, { silent: true });
	}
};

NotificationSMSru.prototype.stop = function () {
	NotificationSMSru.super_.prototype.stop.call(this);

	this.controller.off('notifications.push', this.handler);

	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
		this.vDev = null;
	}
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

NotificationSMSru.prototype.onNotificationHandler = function (config) {
	var self = this;

	return function(notice) {
		if (config.level.indexOf(notice.level) > -1) {
			http.request({
			method: 'POST',
			url: "http://sms.ru/sms/send",
			data: {
				api_id: self.api_key,
				to: self.phone,
				text: self.prefix + " " + notice.message
			}
		});

		}

	}
}
