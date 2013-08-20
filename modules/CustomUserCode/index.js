/******************************************************************************

 CustomUserCode ZAutomation module
 Version: 1.0.0
 (c) ZWave.Me, 2013

 -----------------------------------------------------------------------------
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
        
    this.config.customCodeFiles.forEach(function (file) {
      var stat = fs.stat(file);
      if (stat && stat.type == "file") {
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
