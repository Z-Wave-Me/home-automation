/*** DelayedScene Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    Implements light scene based on virtual devices of type dimmer, switch or anothe scene
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function DelayedScene (id, controller) {
    // Call superconstructor first (AutomationModule)
    DelayedScene.super_.call(this, id, controller);
}

inherits(DelayedScene, AutomationModule);

_module = DelayedScene;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

DelayedScene.prototype.init = function (config) {
    DelayedScene.super_.prototype.init.call(this, config);

    var self = this;

    this.timer = null;
    
    this.timerHandler = this.handler;

    this.triggerHandler = function() {
        if (self.config.singleTimer && self.timer) {	
            clearTimeout(self.timer);
        }
        self.timer = setTimeout(function() {
            self.timerHandler();
        }, self.config.delay * 1000);
        // we do not care about clearing setTimouts in non-singleTimer mode. Just emptying handler if need.
        // If someone knows how to track many handlers and remove them from a list upon fire - you are welcome to improve the code.
    };

    var t_vDev = this.controller.devices.get(this.config.triggerScene);
    if (t_vDev) {
        t_vDev.on("change:metrics:level", this.triggerHandler);
    }
};

DelayedScene.prototype.stop = function () {    
    var t_vDev = this.controller.devices.get(this.config.triggerScene);
    if (t_vDev) {
        t_vDev.off("change:metrics:level", this.triggerHandler);
    }

    if (this.timer) {
        clearTimeout(this.timer);
    }
    
    this.timerHandler = function () {}; // this is to clear actions on all remaining setTimouts without clearing them.
    // We are emtying not the prototype, but function on instance

    DelayedScene.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

DelayedScene.prototype.handler = function() {
    var vDev = this.controller.devices.get(this.config.delayedScene);
    if (vDev) {
        vDev.performCommand("on");
    }
};