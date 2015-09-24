/*** Notification Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: James Millar <islipfd19@gmail.com> Based off
 of Notification module written by Yurkin Vitaliy <ps@z-wave.me>
Description:
  Send notifications by email and sms
Pre-requisites:
1. sendmail must be installed on local system and configured. I recommend 
  following the intructions at:
  'http://linuxconfig.org/configuring-gmail-as-sendmail-email-relay'
2. bash progs 'echo' and 'mail' must be added to .syscommands file in
  /opt/z-way-server/automation/

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Email (id, controller) {
    // Call superconstructor first (AutomationModule)
    Email.super_.call(this, id, controller);
}

inherits(Email, AutomationModule);

_module = Email;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Email.prototype.init = function (config) {
    Email.super_.prototype.init.call(this, config);

    var self = this;

    this.vDev = this.controller.devices.create({
        deviceId: "Email_" + this.id,
        defaults: {
            deviceType: "toggleButton",
            metrics: {
                level: 'on', // it is always on, but usefull to allow bind
                icon: '',
                title: 'Email ' + this.id
            }
        },
        overlay: {},
        handler: function () {
//            console.log("INFO Email: subject " + self.config.subject);
//            console.log("INFO Email: message " + self.config.message);
            _.unique(self.config.devices).forEach(function(email) {
//                console.log("INFO Email: email " + email);
                system('echo "' + self.config.message + '" | mail -s "' + self.config.subject + '" ' + email);
            });


            self.vDev.set("metrics:level", "on"); // update on ourself to allow catch this event
        },
        moduleId: this.id
    });
};

Email.prototype.stop = function () {
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    Email.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

