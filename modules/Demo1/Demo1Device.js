/*** Battery Polling Virtual Device class module ******************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

Demo1Device = function (id, controller) {
    Demo1Device.super_.call(this, id, controller);

    this.deviceType = "switchBinary";
}

inherits(Demo1Device, VirtualDevice);

Demo1Device.prototype.deviceTitle = function () {
    return "Demo1 widget";
}

Demo1Device.prototype.deviceIconBase = function () {
    return "battery";
}

Demo1Device.prototype.performCommand = function (command) {
    console.log("--- Demo1Device.performCommand processing...");

    var handled = true;
    if ("update" === command) {
    } else if ("off" === command) {
        controller.addNotification("notice", "I'm OFF", "");
    } else if ("on" === command) {
        controller.addNotification("notice", "I'm ON", "device");
    } else {
        handled = false;
    }

    return handled ? true : Demo1Device.super_.prototype.performCommand.call(this, command);
}
