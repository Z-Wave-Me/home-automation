/*** Switch Control Virtual Device class module ******************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Poltorak Serguei <ps@z-wave.me>

Copyright: (c) ZWave.Me, 2014

******************************************************************************/

SwitchControlDevice = function (id, controller) {
    SwitchControlDevice.super_.call(this, id, controller);
    this.deviceType = "switchControl";
}

inherits(SwitchControlDevice, VirtualDevice);

SwitchControlDevice.prototype.deviceTitle = function () {
    return "Switch control " + this.id.toString();
}

SwitchControlDevice.prototype.performCommand = function (command) {
    return this.activationHandler(command) ? true : SwitchControlDevice.super_.prototype.performCommand.call(this, command);
}
