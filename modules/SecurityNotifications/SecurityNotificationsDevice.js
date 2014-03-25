/*** Security Notifications enabler Virtual Device class module ******************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Poltorak Serguei <ps@z-wave.me>

Copyright: (c) ZWave.Me, 2014

******************************************************************************/

SecurityNotificationsDevice = function (id, controller) {
    SecurityNotificationsDevice.super_.call(this, id, controller);

    this.deviceType = "switchBinary";
}

inherits(SecurityNotificationsDevice, VirtualDevice);

SecurityNotificationsDevice.prototype.deviceTitle = function () {
    return "Security notification";
}

SecurityNotificationsDevice.prototype.deviceIconBase = function () {
    return "switchBinary";
}

SecurityNotificationsDevice.prototype.performCommand = function (command) {
    console.log("--- SecurityNotificationsDevice.performCommand processing...");

    var handled = true;
    if ("on" === command) {
        this.setMetricValue("level", "on");
    } else if ("off" === command) {
        this.setMetricValue("level", "off");
    } else {
        handled = false;
    }

    return handled ? true : SecurityNotificationsDevice.super_.prototype.performCommand.call(this, command);
}
