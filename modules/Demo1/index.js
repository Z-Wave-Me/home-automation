/*** Demo1 Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2013
-----------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Description:
    This module periodically requests all batery devices for battery level report

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Demo1 (id, controller) {
    // Call superconstructor first (AutomationModule)
    Demo1.super_.call(this, id, controller);
}

inherits(Demo1, AutomationModule);

_module = Demo1;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Demo1.prototype.init = function (config) {
    Demo1.super_.prototype.init.call(this, config);

    var self = this;

    executeFile(this.moduleBasePath()+"/Demo1Device.js");
    this.vdev = new Demo1Device("Demo1", this.controller);
    this.vdev.init();
    this.controller.registerDevice(this.vdev);
    
    console.logJS(this.config.title);
};

Demo1.prototype.stop = function () {
    Demo1.super_.prototype.stop.call(this);

    this.controller.removeDevice(this.vdev.id);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

