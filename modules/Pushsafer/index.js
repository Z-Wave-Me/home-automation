/*** Z-Wave-Me-pushsafer Z-Way HA module *******************************************

Version: 1.0.5
(c) 2023 Appzer.de
-----------------------------------------------------------------------------
Author: Kevin Siml
Description: Send Push Notification by Pushsaver.com Service
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function NotificationPushsafer (id, controller) {
    // Call superconstructor first (AutomationModule)
    NotificationPushsafer.super_.call(this, id, controller);
}

inherits(NotificationPushsafer, AutomationModule);

_module = NotificationPushsafer;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

NotificationPushsafer.prototype.init = function (config) {
    NotificationPushsafer.super_.prototype.init.call(this, config);

    var self = this;

    this.vDev = this.controller.devices.create({
        deviceId: "NotificationPushsafer_" + this.id,
	defaults: {
        deviceType: "toggleButton",
        //deviceType: "switchBinary",
	// in case you want to use if<>then you may want to switch devicetype "switchBinary" to handle events
	    metrics: {
               level: 'on', // it is always on, but usefull to allow bind
               icon: '',
               title: 'NotificationPushsafer ' + this.id
            }
        },
        overlay: {},
        handler: function () {
            // If Private Keys and Message for Pushsafer exist, then send message
            if (self.config.private_key_token && self.config.message) {
                http.request({
                    method: 'POST',
                    url: "https://www.pushsafer.com/api",
                    data: {
                        k: self.config.private_key_token,
			m: self.config.message,
			t: self.config.message_title,
			d: self.config.device,
			i: self.config.icon,
			c: self.config.iconcolor,
			s: self.config.sound,
			v: self.config.vibration,
			u: self.config.url,
			ut: self.config.urltitle,
			l: self.config.time2live,
			pr: self.config.priority,
			re: self.config.retry,
			ex: self.config.expire,
			cr: self.config.confirm,
			a: self.config.answer,
			ao: self.config.answeroptions,
			af: self.config.answerforce
                    }
                });
            }

            self.vDev.set("metrics:level", "on"); // update on ourself to allow catch this event
        },
        moduleId: this.id
    });
};

NotificationPushsafer.prototype.stop = function () {
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    NotificationPushsafer.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
