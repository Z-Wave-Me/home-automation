/*** Scene Constructor Virtual Device class module ******************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Poltorak Serguei <ps@z-wave.me>

Copyright: (c) ZWave.Me, 2014

******************************************************************************/

SceneConstructorDevice = function (id, controller) {
    SceneConstructorDevice.super_.call(this, id, controller);
    this.deviceType = "toggleButton";
}

inherits(SceneConstructorDevice, VirtualDevice);

SceneConstructorDevice.prototype.deviceTitle = function () {
    return "Activate scene " + this.id.toString();
}

SceneConstructorDevice.prototype.performCommand = function (command) {
    var handled = true;
    if ("on" === command) {
        if (this.activationHandler) {
            this.activationHandler();
        }
    } else {
        handled = false;
    }

    return handled ? true : SceneConstructorDevice.super_.prototype.performCommand.call(this, command);
}
