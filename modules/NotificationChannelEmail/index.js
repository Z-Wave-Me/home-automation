/*** NotificationChannelEmail Z-Way HA module *******************************************

 Version: 3.0.0
 (c) Z-Wave.Me, 2020
 -----------------------------------------------------------------------------
 Author: Serguei Poltorak <ps@z-wave.me>
 Description:
 Add notification channel and send notifications via e-mail.

 ******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function NotificationChannelEmail (id, controller) {
	// Call superconstructor first (AutomationModule)
	NotificationChannelEmail.super_.call(this, id, controller);

	this.emailRe = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
}

inherits(NotificationChannelEmail, AutomationModule);

_module = NotificationChannelEmail;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

NotificationChannelEmail.prototype.init = function (config) {
	NotificationChannelEmail.super_.prototype.init.call(this, config);

	this.remote_id = this.controller.getRemoteId();

	this.disabled = false;
	
	this.collectedMessages = [];

	this.subscribe(config);

	var self = this;
	
	this.onProfileUpdate = function(profile) {
		self.unsubscribe();
		self.subscribe(config);
	}
	
	this.controller.on('profile.updated', this.onProfileUpdate);
};

NotificationChannelEmail.prototype.stop = function () {
	if (this.timer) {
		clearInterval(this.timer);
		this.timer = undefined;
	}
	
	if (this.onProfileUpdate) {
		this.controller.off('profile.updated', this.onProfileUpdate);
	}
	
	this.unsubscribe();
	
	NotificationChannelEmail.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

NotificationChannelEmail.prototype.subscribe = function(config) {
	var self = this;
	
	// Loop thru all configured mails
	config.channels.forEach(function (channel) {
		if (self.emailRe.test(channel.email)) {
			var user = channel.user || 0;
			self.controller.registerNotificationChannel(self.channelID(user, channel.email), user, "E-Mail to " + channel.email, function(message) {
				self.sender(channel.email, message);
			});
		} else if (channel.email) {
			self.addNotification('error', 'Invalid e-mail addrress ' + channel.email, 'module');
		}
	});
	
	// Loop thru mails of all users
	this.controller.profiles.forEach(function (user) {
		if (self.emailRe.test(user.email)) {
			self.controller.registerNotificationChannel(self.channelID(user.id, user.email), user.id, "E-Mail to " + user.name + " (" + user.email + ")", function(message) {
				self.sender(user.email, message);
			});
		} else if (user.email) {
			self.addNotification('error', 'invalid e-mail addrress ' + user.email, 'module');
		}
	});
};

NotificationChannelEmail.prototype.unsubscribe = function() {
	var self = this;
	
	// uregister all in one shot by prefix
	Object.keys(this.controller.notificationChannels).forEach(function (id) {
		var prefix = self.channelIDPrefix();
		
		if (id.lastIndexOf(prefix) === 0) {
			self.controller.unregisterNotificationChannel(id);
		}
	});
};

NotificationChannelEmail.prototype.channelIDPrefix = function() {
	return this.getName() + "_" + this.id + "_";
};

NotificationChannelEmail.prototype.channelID = function(profileId, email) {
	return this.channelIDPrefix() + profileId + "_" + email;
};

NotificationChannelEmail.prototype.sender = function(to, message) {
	if (this.disabled) return;
	
	// check mail validity
	if (!this.emailRe.test(to)) {
		this.addNotification('error', 'invalid e-mail addrress ' + to, 'module');
		return;
	}
	
	this.collectedMessages.push({
		mail_to: to,
		message: message
	});
	
	if (!this.timer) {
		this.sendSendMessageWithDelay();
	}
}

NotificationChannelEmail.prototype.sendSendMessageWithDelay = function () {
	var self = this,
		mailObject = {};

	this.timer = setInterval( function() {

		if (self.collectedMessages.length > 0) {
			mailObject = self.collectedMessages.shift();

			console.log(self.getName() + " Sending a message to " + mailObject.mail_to);
			http.request({
				method: "POST",
				url: "https://service.z-wave.me/emailnotification/index.php",
				async: true,
				data: {
					remote_id: self.remote_id,
					mail_to: mailObject.mail_to,
					subject: mailObject.message,
					message: mailObject.message + "<br>" + (new Date()),
					language: self.controller.defaultLang
				},
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				},
				error: function(response) {
					console.log("NotificationChannelEmail error: " + (typeof response !== 'string'? JSON.stringify(response) : response));
					self.disabled = true; // disable infinite loop sending e-mail notification about faulure to send e-mail notification
					self.addNotification('error', 'NotificationChannelEmail error' + (typeof response === 'string'? ': ' + JSON.stringify(response) : ''), 'module');
					self.disabled = false;
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
