/*** MailNotifier Z-Way HA module *******************************************

 Version: 3.0.0
 (c) Z-Wave.Me, 2019
 -----------------------------------------------------------------------------
 Author: Niels Roche <nir@zwave.eu>
 Changed: Marcel Kermer <mk@zwave.eu>
 Changed: Hans-Christian Göckeritz <hcg@zwave.eu>
 Changed: Serguei Poltorak <ps@z-wave.me>
 Description:
 This module allows to send notifications via mail.

 ******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function MailNotifier (id, controller) {
	// Call superconstructor first (AutomationModule)
	MailNotifier.super_.call(this, id, controller);
}

inherits(MailNotifier, AutomationModule);

_module = MailNotifier;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

MailNotifier.prototype.init = function (config) {
	MailNotifier.super_.prototype.init.call(this, config);

	this.remote_id = this.controller.getRemoteId();
	this.subject = config.subject;

	this.collectMessages = [];

	var self = this;

	// Do we need this ______________ !!!!!!!!!!!!!!!!!!!!!!!!!!!!
	this.controller.on('notifications.push', this.getNotificationChannelSender());
	
	// Looop thru all configured mails and mails of users !!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	this.controller.registerNotificationChannel(this.vDev.id + "_" + this.mail_to, this.mail_to, this.getNotificationChannelSender());
};

MailNotifier.prototype.stop = function () {
	if (this.timer) {
		clearInterval(this.timer);
		this.timer = undefined;
	}

	// Looop thru all configured mails and mails of users !!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	this.controller.unregisterNotificationChannel(this.vDev.id + "_" + this.mail_to);
	
	this.controller.off('notifications.push', this.notificationMailWrapper);
	MailNotifier.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

MailNotifier.prototype.getNotificationChannelSender = function() {
	var self = this;
	
	return function(to, message) {
		// check mail validity !!!!!!!!!!!!!!!!!!!!!!!!!!!!
		
		self.collectMessages.push({
			mail_to: to,
			message: message
		});

		if (!self.timer) {
			self.sendSendMessageWithDelay();
		}
	};
}

MailNotifier.prototype.sendSendMessageWithDelay = function () {
	var self = this,
		mailObject = {};

	this.timer = setInterval( function() {

		if (self.collectMessages.length > 0) {
			mailObject = self.collectMessages.shift();

			http.request({
				method: "POST",
				url: "https://service.z-wave.me/emailnotification/index.php",
				async: true,
				data: {
					remote_id: self.remote_id,
					mail_to: mailObject.mail_to,
					subject: self.subject,
					message: mailObject.message,
					language: self.controller.defaultLang
				},
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				},
				error: function(response) {
					self.addNotification('error', 'MailNotifier-ERROR: ' + (typeof response !== 'string'? JSON.stringify(response) : response), 'module');
				}
			});
		} else {
			if (self.timer) {
				clearInterval(self.timer);
				self.timer = undefined;
			}
		}
	}, 5000);
};
