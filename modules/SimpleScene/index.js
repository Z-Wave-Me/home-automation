/*** SimpleScene Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SimpleScene (id, controller) {
    // Call superconstructor first (AutomationModule)
    SimpleScene.super_.call(this, id, controller);
}

inherits(SimpleScene, AutomationModule);

_module = SimpleScene;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SimpleScene.prototype.init = function (config) {
    SimpleScene.super_.prototype.init.call(this, config);

    var self = this;

    executeFile(this.moduleBasePath()+"/SimpleSceneDevice.js");
    this.vdev = new SimpleSceneDevice("SimpleScene", this.controller);
    this.vdev.init();
    this.controller.registerDevice(this.vdev);
};

SimpleScene.prototype.stop = function () {
    this.controller.removeDevice(this.vdev.id);

    SimpleScene.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

