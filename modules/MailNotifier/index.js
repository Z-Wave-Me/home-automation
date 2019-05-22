/*** MailNotifier Z-Way HA module *******************************************

 Version: 1.2.0
 (c) Z-Wave.Me, 2017
 -----------------------------------------------------------------------------
 Author: Niels Roche <nir@zwave.eu>
 Changed: Marcel Kermer <mk@zwave.eu>
 Changed: Hans-Christian Göckeritz <hcg@zwave.eu>
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

	this.remote_id = this.controller.getRemoteId;
	this.subject = config.subject;

	// TODO check for undefined e-mail
	// first check input
	if (config.mail_to_input !== "" && config.allow_input)
	{
		this.mail_to = config.mail_to_input;
	}
	// use select field if assigned
	else if(config.mail_to_select !== "")
	{
		this.mail_to = config.mail_to_select;
	}


	//console.log(this.mail_to);
	this.message = config.mail_message;
	this.collectMessages = [];

	var self = this;

	this.vDev = this.controller.devices.create({
		deviceId: "MailNotifier_" + this.id,
		defaults: {
			metrics: {
				level: 'on',
				title: self.getInstanceTitle(this.id),
				icon: "/ZAutomation/api/v1/load/modulemedia/MailNotifier/icon.png",
				message: ""
			}
		},
		overlay: {
			deviceType: 'toggleButton',
			probeType: 'notification_email'
		},
		handler: function(command, args) {
			var mailObject = {};
			var send_mail = false;
			if (command !== 'update') {
				if (send_mail |= command === "on") {
					//self.collectMessages++;
					mailObject.message = self.config.mail_message;
					mailObject.mail_to = self.config.mail_to_input === '' ? self.config.mail_to_select : self.config.mail_to_input;
					self.collectMessages.push(mailObject);
				} else if (send_mail |= command === "send") {
					//self.collectMessages++;
					mailObject.message = args.message;
					mailObject.mail_to = args.mail_to;
					self.collectMessages.push(mailObject);
				}

				// TODO check for mail address
				if (!mailObject.mail_to || mailObject.mail_to === '') {
					self.addNotification('error', 'Missing receiver e-mail address. Please check your configuration in the following app instance: ' + self.config.title, 'module');
					return;
				}

				// add delay timer if not existing
				if(!self.timer && send_mail){
					self.sendSendMessageWithDelay();
				}
				
				self.vDev.set("metrics:level", "on"); // update on ourself to allow catch this event
			}
		},
		moduleId: this.id
	});

	if (config.hide === true) {
		this.vDev.set('visibility', false, {silent: true});
	} else {
		this.vDev.set('visibility', true, {silent: true});
	}

	// wrap method with a function
	this.notificationMailWrapper = function(notification) {
		if (notification.level === 'mail.notification'){
			var instance = self.controller.instances.filter(function (instance){
				return instance.params.mail_to_select === notification.type;
			});

			if(typeof instance[0] !== 'undefined') {
				var new_vDev = self.controller.devices.get(instance[0].moduleId + '_' + instance[0].id);

				if (instance[0].id === self.vDev.get('creatorId')) {
					new_vDev.performCommand('send', {mail_to: notification.type, message: notification.message});
				}
			} else {
				var def_instance = self.controller.instances.filter(function (instance){
					return instance.moduleId === 'MailNotifier';
				});
				if(typeof def_instance[0] !== 'undefined') {
					var def_vDev = self.controller.devices.get(def_instance[0].moduleId + '_' + def_instance[0].id);

					if (def_instance[0].id === self.vDev.get('creatorId')) {
						def_vDev.performCommand('send', {mail_to: notification.type, message: notification.message});
					}
				}
			}
		}
	};

	self.controller.on('notifications.push', self.notificationMailWrapper);
};

MailNotifier.prototype.stop = function () {
	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
		this.vDev = null;
	}

	if (this.timer) {
		clearInterval(this.timer);
		this.timer = undefined;
	}

	this.controller.off('notifications.push', this.notificationMailWrapper);
	MailNotifier.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

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
					message: self.vDev.get('metrics:message') !== ''? self.vDev.get('metrics:message') : mailObject.message,
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