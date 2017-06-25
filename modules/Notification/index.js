/*** Notification Z-Way HA module *******************************************

Version: 1.1.0
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Yurkin Vitaliy <ps@z-wave.me>
Description:
    Send notifications by email and sms
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Notification (id, controller) {
    // Call superconstructor first (AutomationModule)
    Notification.super_.call(this, id, controller);
}

inherits(Notification, AutomationModule);

_module = Notification;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Notification.prototype.init = function (config) {
    Notification.super_.prototype.init.call(this, config);

    var self = this;

    this.vDev = this.controller.devices.create({
        deviceId: "Notification_" + this.id,
        defaults: {
            deviceType: "toggleButton",
            metrics: {
                level: "on", // it is always on, but usefull to allow bind
                icon: "gesture",
                title: self.getInstanceTitle()
            }
        },
        overlay: {},
        handler: function () {
            // If API Key from sms.ru and Phone number exist, then send sms
            // if (typeof self.config.api_key_sms !== 'undefined' && typeof self.config.phone !== 'undefined') {
            if (self.config.api_key_sms && self.config.phone) {
                http.request({
                    method: 'POST',
                    url: "http://sms.ru/sms/send",
                    data: {
                        api_id: self.config.api_key_sms,
                        to: self.config.phone,
                        text: self.config.message
                    }
                });
            }

            // If API Key from mandrillapp.com and Email exist, then send email
            //if (typeof self.config.api_key_email !== 'undefined' && typeof self.config.email !== 'undefined') {
            if (self.config.api_key_email && self.config.email) {
                http.request({
                    method: 'POST',
                    url: "https://mandrillapp.com/api/1.0/messages/send.json",
                    data: {
                        key: self.config.api_key_email,
                        message: {
                            from_email: self.config.email,
                            to: [{email: self.config.email, type: "to"}],
                            subject: "Notification from Smart Home",
                            text: self.config.message
                        }
                    }
                });
            }

            self.vDev.set("metrics:level", "on"); // update on ourself to allow catch this event
        },
        moduleId: this.id
    });
};

Notification.prototype.stop = function () {
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    Notification.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
