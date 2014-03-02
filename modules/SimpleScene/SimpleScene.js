/*** Simple Scene Virtual Device class module ******************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Poltorak Serguei <ps@z-wave.me>

Copyright: (c) ZWave.Me, 2014

******************************************************************************/

SimpleSceneDevice = function (id, controller) {
    SimpleSceneDevice.super_.call(this, id, controller);

    this.deviceType = "scene";
}

inherits(SimpleSceneDevice, VirtualDevice);

SimpleSceneDevice.prototype.deviceTitle = function () {
    return "Scene activtion"
}

SimpleSceneDevice.prototype.performCommand = function (command) {
    console.log("--- SimpleSceneDevice.performCommand processing...");

    var handled = true;
    if ("on" === command) {
        for (var id in zway.devices) {
            zway.devices[id].Battery && zway.devices[id].Battery.Get();
        }
    } else {
        handled = false;
    }

    return handled ? true : SimpleSceneDevice.super_.prototype.performCommand.call(this, command);
}
