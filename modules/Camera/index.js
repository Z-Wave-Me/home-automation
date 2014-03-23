/*** Camera Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2013
-----------------------------------------------------------------------------
Author: Stanislav Morozov <r3b@seoarmy.ru>
Description:
    This module saved params of camera

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Camera (id, controller) {
    // Call superconstructor first (AutomationModule)
    Camera.super_.call(this, id, controller);
}

inherits(Camera, AutomationModule);

_module = Camera;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Camera.prototype.init = function (config) {
    Camera.super_.prototype.init.call(this, config);
    executeFile(this.moduleBasePath() + "/CameraDevice.js");

    var that = this;
    that.vdev = new CameraDevice("Camera_" + that.id, that.controller);
    that.vdev.setMetricValue("url", config.url);
    that.vdev.init();
    that.controller.registerDevice(that.vdev);
};

Camera.prototype.stop = function () {
    Camera.super_.prototype.stop.call(this);

    this.controller.removeDevice(this.vdev.id);
};