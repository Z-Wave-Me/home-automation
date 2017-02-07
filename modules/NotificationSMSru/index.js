/*** NotificationSMSru Z-Way HA module *******************************************

Version: 1.1.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    This module allows to send notifications via SMS.ru proxy.

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

    this.handler = this.onNotificationHandler(config);
    
    this.api_key = config.api_key.toString();
    this.phone = config.phone.toString();
    this.prefix = config.prefix.toString();

    this.controller.on('notifications.push', this.handler);
};

NotificationSMSru.prototype.stop = function () {
    NotificationSMSru.super_.prototype.stop.call(this);

    this.controller.off('notifications.push', this.handler);
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
