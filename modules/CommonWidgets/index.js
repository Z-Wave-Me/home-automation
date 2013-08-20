/******************************************************************************

 Z-Way Home Automation Common Widgets module
 Version: 1.0.0
 (c) ZWave.Me, 2013

 -----------------------------------------------------------------------------
 Author: Gregory Sitnin <sitnin@z-wave.me>

 Description:
     This module registers common widgets library

 Emits:
   - widgets.register for the common widgets library

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function CommonWidgets (id, controller) {
    // Call superconstructor first (AutomationModule)
    CommonWidgets.super_.call(this, id, controller);
}

inherits(CommonWidgets, AutomationModule);

_module = CommonWidgets;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

CommonWidgets.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    CommonWidgets.super_.prototype.init.call(this, config);

    // Remember "this" for detached callbacks (such as event listener callbacks)
    var self = this;

    this.config.widgets.forEach(function (widgetId) {
        var widgetMeta = {
            "id": widgetId,
            "code": widgetId+"Widget.js",
            "template": widgetId+"Widget.html"
        }
        self.controller.emit("widgets.register", widget);
    });
};
