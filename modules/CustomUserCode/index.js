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

	// TODO: executeJS errors are impossible to catch!
	//try {
		executeJS(this.config.customCode);
	//} catch (e) {
	//	  var langFile = this.loadModuleLang(),
	//		   values = this.get("metrics:title");
	//		   
	//	this.addNotification("warning", langFile.err_load + values, "module");
	//}
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// This module has no additional methods
