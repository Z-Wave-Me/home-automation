  /*** CustomUserCode ZAutomation module ****************************************

Version: 1.0.0
(c) Z-Wave.Me, 2013

-------------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    This module executes custom JS code listed in configuration parameters.

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function CustomUserCode (id, controller) {
    // Call superconstructor first (AutomationModule)
    CustomUserCode.super_.call(this, id, controller);
}

inherits(CustomUserCode, AutomationModule);

_module = CustomUserCode;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

CustomUserCode.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    CustomUserCode.super_.prototype.init.call(this, config);

    var self = this;

    this.timer = null;

    this.timeoutHandler = this.handler;

    if(self.timer) {
	clearTimeout(self.timer);
    }
    self.timer = setTimeout(function() {
	self.timeoutHandler();
    }, self.config.delay*1000);
    
};

CustomUserCode.prototype.stop = function () {

    if(this.timer) {
	clearTimeout(this.timer);
    }

    this.timeoutHandler = function () {};

    CustomUserCode.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

CustomUserCode.prototype.handler = function() {
    // TODO: executeJS errors are impossible to catch!
    //try {
        executeJS(this.config.customCode);
    //} catch (e) {
    //    controller.addNotification("warning", "Failed to load custom user code: " + this.get("metrics:title"), "module");
    //}    
};
