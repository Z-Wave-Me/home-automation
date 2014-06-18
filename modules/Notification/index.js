/*** Notification Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
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

    this.vDev = this.controller.devices.create("Notification_" + this.id, {
        deviceType: "toggleButton",
        metrics: {
            level: 'on', // it is always on, but usefull to allow bind
            icon: '',
            title: 'Notification ' + this.id
        }
    }, function () {
        var email = self.config.email,
            phone   = self.config.phone;

        console.log("email:",email);
        console.log("phone:",phone);

        http.request({
            method: 'POST',
            url: "http://sms.ru/sms/send",
            data: {
                api_id: self.config.api_key,
                to: self.config.phone,
                text: self.config.message
                }
        });

        self.vDev.set("metrics:level", "on"); // update on ourself to allow catch this event
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
