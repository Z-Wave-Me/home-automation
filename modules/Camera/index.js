/*** Camera Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2013
-----------------------------------------------------------------------------
Author: Stanislav Morozov <r3b@seoarmy.ru>
Description:
    This module stores params of camera

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

    var url = config.url || null,
        zoomInUrl = config.zoomInUrl || null,
        zoomOutUrl = config.zoomOutUrl || null,
        leftUrl = config.leftUrl || null,
        rightUrl = config.rightUrl || null,
        upUrl = config.upUrl || null,
        downUrl = config.downUrl || null,
        openUrl = config.openUrl || null,
        closeUrl = config.closeUrl || null;

    this.vDev = this.controller.devices.create("CameraDevice_" + this.id, {
        deviceType: "camera",
        metrics: {
            probeTitle: '',
            scaleTitle: '',
            url: url,
            zoomInUrl: zoomInUrl,
            zoomOutUrl: zoomOutUrl,
            leftUrl: leftUrl,
            rightUrl: rightUrl,
            upUrl: upUrl,
            downUrl: downUrl,
            openUrl: openUrl,
            closeUrl: closeUrl,
            icon: 'camera',
            title: 'Camera ' + this.id
        }
    });
};

Camera.prototype.stop = function () {
    Camera.super_.prototype.stop.call(this);

    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }
};