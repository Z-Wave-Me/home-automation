/*** MailNotifier Z-Way HA module *******************************************

 Version: 1.0.9
 (c) Z-Wave.Me, 2016
 -----------------------------------------------------------------------------
 Author: Niels Roche <nir@zwave.eu>
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
    this.mail_to = config.mail_to_select !== "" ? config.mail_to_select : config.mail_to_input;
    this.message = config.mail_message;
    this.collectMessages = 0;

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

            if (command !== 'update') {
                if (command === "on") {

                    self.collectMessages++;

                    // add delay timer if not existing
                    if(!self.timer){
                        self.sendSendMessageWithDelay();
                    }
                }
            }
        },
        moduleId: this.id
    });

    if (config.hide === true) {
        this.vDev.set('visibility', false, {silent: true});
    } else {
        this.vDev.set('visibility', true, {silent: true});
    }

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

    MailNotifier.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

MailNotifier.prototype.sendSendMessageWithDelay = function () {
    var self = this;

    this.timer = setInterval( function() {

        if (self.collectMessages > 0) {

            http.request({
                method: "POST",
                url: "https://service.z-wave.me/emailnotification/index.php",
                async: true,
                data: {
                    remote_id: self.remote_id,
                    mail_to: self.mail_to,
                    subject: self.subject,
                    message: self.vDev.get('metrics:message') !== ''? self.vDev.get('metrics:message') : self.message,
                    language: self.controller.defaultLang
                },
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                error: function(response) {
                    console.log("MailNotifier-ERROR: " + response.message);
                }
            });

            self.collectMessages--;
        } else {
            if (self.timer) {
                clearInterval(self.timer);
                self.timer = undefined;
            }
        }
    }, 5000);
};


MailNotifier.prototype.getInstanceTitle = function (instanceId) {
    var instanceTitle = this.controller.instances.filter(function (instance){
        return instance.id === instanceId;
    });

    return instanceTitle[0] && instanceTitle[0].title? instanceTitle[0].title : 'Mail Notifier ' + this.id;
};