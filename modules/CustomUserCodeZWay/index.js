  /*** CustomUserCodeZWay ZAutomation module ****************************************

Version: 1.0.0
(c) Z-Wave.Me, 2015

-------------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    This module executes custom JS code listed in configuration parameters on Z-Way start/stop.

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function CustomUserCodeZWay (id, controller) {
    // Call superconstructor first (AutomationModule)
    CustomUserCodeZWay.super_.call(this, id, controller);
}

inherits(CustomUserCodeZWay, AutomationModule);

_module = CustomUserCodeZWay;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

CustomUserCodeZWay.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    CustomUserCodeZWay.super_.prototype.init.call(this, config);

    var self = this;
    
    this.loaded = false;

    this.bindZWay = function (zwayName) {
        if (zwayName !== self.config.zway) {
           return;
        }

        self.loaded = true;
    
        // TODO: executeJS errors are impossible to catch!
        //try {
            executeJS(self.config.customCodeOnLoad);
        //} catch (e) {
        //    var langFile = this.loadModuleLang();
        //           
        //    this.addNotification("warning", langFile.err_load, "module");
        //}
    };

    this.unbindZWay = function (zwayName) {
        if (zwayName !== self.config.zway) {
            return;
        }

        self.loaded = false;
    
        // TODO: executeJS errors are impossible to catch!
        //try {
            executeJS(self.config.customCodeOnUnload);
        //} catch (e) {
        //    var langFile = this.loadModuleLang();
        //           
        //    this.addNotification("warning", langFile.err_load, "module");
        //}
    };

    if (global.ZWave && global.ZWave[this.config.zway]) {
        this.bindZWay(this.config.zway);
    }
    global.controller.on("ZWave.register", this.bindZWay);
    global.controller.on("ZWave.unregister", this.unbindZWay);
};

CustomUserCodeZWay.prototype.stop = function() {
    if (this.loaded === true) {
        this.unbindZWay(this.config.zway);
    }
    
    global.controller.off("ZWave.register", this.bindZWay);
    global.controller.off("ZWave.unregister", this.unbindZWay);
    
    CustomUserCodeZWay.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// This module has no additional methods
