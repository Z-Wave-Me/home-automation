/*** Simple Scene Virtual Device class module ******************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Poltorak Serguei <ps@z-wave.me>

Copyright: (c) ZWave.Me, 2014

******************************************************************************/

SimpleSceneDevice = function (id, controller) {
    SimpleSceneDevice.super_.call(this, id, controller);
    this.deviceType = "toggleButton";
}

inherits(SimpleSceneDevice, VirtualDevice);

SimpleSceneDevice.prototype.deviceTitle = function () {
    return "Activate scene"
}

SimpleSceneDevice.prototype.performCommand = function (command) {
    var handled = true;
    if ("on" === command) {
        this.config.switches.forEach(function(devState) {
            var vDev = this.controller.findVirtualDeviceById(devState.device);
            if (vDev) {
                vDev.performCommand(devState.state ? "on" : "off");
            }
        });
        this.config.dimmers.forEach(function(devState) {
            var vDev = this.controller.findVirtualDeviceById(devState.device);
            if (vDev) {
                vDev.performCommand(devState.state);
            }
        });
        this.config.scenes.forEach(function(devState) {
            var vDev = this.controller.findVirtualDeviceById(devState.device);
            if (vDev) {
                vDev.performCommand("on");
            }
        });
    } else {
        handled = false;
    }

    return handled ? true : SimpleSceneDevice.super_.prototype.performCommand.call(this, command);
}
