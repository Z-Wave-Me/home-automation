/*** NotificationChannelSMSru Z-Way HA module *******************************************

Version: 2.0.0
(c) Z-Wave.Me, 2020
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
	This module allows to send notifications via SMS.ru proxy.

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function NotificationChannelSMSru (id, controller) {
	// Call superconstructor first (AutomationModule)
	NotificationChannelSMSru.super_.call(this, id, controller);
}

inherits(NotificationChannelSMSru, AutomationModule);

_module = NotificationChannelSMSru;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

NotificationChannelSMSru.prototype.channelID = function() {
        return this.getName() + "_" + this.id;
};

NotificationChannelSMSru.prototype.init = function (config) {
	NotificationChannelSMSru.super_.prototype.init.call(this, config);

	var self = this;	
	this.controller.registerNotificationChannel(this.channelID(), config.user, "SMS to " + config.phone.toString(), function(message) {
		self.sender(message);
	});
};

NotificationChannelSMSru.prototype.stop = function () {
	NotificationChannelSMSru.super_.prototype.stop.call(this);
	
	this.controller.unregisterNotificationChannel(this.channelID());
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

NotificationChannelSMSru.prototype.sender = function (message) {
	console.log(this.getName() + " Sending a message to " + this.config.phone);
	http.request({
		method: 'POST',
		url: "https://sms.ru/sms/send",
		async: true,
		data: {
			api_id: this.config.api_key.toString(),
			to: this.config.phone.toString(),
			msg: this.config.prefix.toString() + " " + message
		}
	});
}
