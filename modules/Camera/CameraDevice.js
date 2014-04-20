/*** Camera Virtual Device class module ******************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Stanislav Morozov <r3b@seoarmy.ru>

Copyright: (c) ZWave.Me, 2014

******************************************************************************/

CameraDevice = function (id, controller) {
    CameraDevice.super_.call(this, id, controller);

    this.deviceType = "camera";
}

inherits(CameraDevice, VirtualDevice);

CameraDevice.prototype.deviceTitle = function () {
    return "Camera";
}

CameraDevice.prototype.deviceIcon = function () {
    return "camera";
}

CameraDevice.prototype.performCommand = function (command) {
    console.log("--- CameraDevice.performCommand processing...");
    console.log("--- Command: " + command);

    var handled = true;
    if ("test" === command) {
        console.log('test');
    } else {
        handled = false;
    }

    return handled ? true : CameraDevice.super_.prototype.performCommand.call(this, command);
}
