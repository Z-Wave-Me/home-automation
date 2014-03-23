  /*** CustomUserCodeLoader ZAutomation module ****************************************

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

function CustomUserCodeLoader (id, controller) {
    // Call superconstructor first (AutomationModule)
    CustomUserCodeLoader.super_.call(this, id, controller);
}

inherits(CustomUserCodeLoader, AutomationModule);

_module = CustomUserCodeLoader;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

CustomUserCodeLoader.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    CustomUserCodeLoader.super_.prototype.init.call(this, config);

    this.config.customCodeFiles.forEach(function (file) {
        if (!file)
            return;
        var stat = fs.stat(file);
        if (stat && stat.type === "file") {
            executeFile(file);
        } else {
            console.log("File " + file + " not found");
        }
    });
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// This module has no additional methods
