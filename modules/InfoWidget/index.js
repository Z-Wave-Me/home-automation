/*** InfoWidget Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Niels Roche <nir@zwave.eu>
Description:
    Creates a text/information widget as devicetype 'text'
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function InfoWidget (id, controller) {
    // Call superconstructor first (AutomationModule)
    InfoWidget.super_.call(this, id, controller);
}

inherits(InfoWidget, AutomationModule);

_module = InfoWidget;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

InfoWidget.prototype.init = function (config) {
    InfoWidget.super_.prototype.init.call(this, config);

    var self = this;

    this.vDev = this.controller.devices.create({
        deviceId: "InfoWidget_" + this.id,
        defaults: {
            metrics: {
                title: this.config.headline,
                text: this.config.text,
                img: this.config.imgURI
            }          
        },
        overlay: {
            deviceType: "text"
        },
        moduleId: this.id
    });
};

InfoWidget.prototype.stop = function () {
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    InfoWidget.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
