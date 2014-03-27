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

    var that = this,
        url = config.url || null,
        zoomInUrl = config.zoomInUrl || null,
        zoomOutUrl = config.zoomOutUrl || null,
        leftUrl = config.leftUrl || null,
        rightUrl = config.rightUrl || null,
        upUrl = config.upUrl || null,
        downUrl = config.downUrl || null,
        openUrl = config.openUrl || null,
        closeUrl = config.closeUrl || null;

    that.vdev = new CameraDevice("Camera_" + that.id, that.controller);
    that.vdev.setMetricValue("url", url);

    that.vdev.setMetricValue("zoomInUrl", zoomInUrl);
    that.vdev.setMetricValue("zoomOutUrl", zoomOutUrl);
    that.vdev.setMetricValue("leftUrl", leftUrl);
    that.vdev.setMetricValue("rightUrl", rightUrl);
    that.vdev.setMetricValue("upUrl", upUrl);
    that.vdev.setMetricValue("downUrl", downUrl);
    that.vdev.setMetricValue("openUrl", openUrl);
    that.vdev.setMetricValue("closeUrl", closeUrl);

    that.vdev.init();
    that.controller.registerDevice(that.vdev);
};

Camera.prototype.stop = function () {
    Camera.super_.prototype.stop.call(this);

    this.controller.removeDevice(this.vdev.id);
};