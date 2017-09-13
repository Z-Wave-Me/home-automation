/*** ZMEOpenWRT Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2016
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
	Support for some Z-Wave.Me specific OpenWRT features:
	 - TimeZone selection (list of TZ was taken from https://wiki.openwrt.org/doc/uci/system#time_zones)
	 - Open access to all ports from WAN
	 
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function ZMEOpenWRT (id, controller) {
	// Call superconstructor first (AutomationModule)
	ZMEOpenWRT.super_.call(this, id, controller);
}

inherits(ZMEOpenWRT, AutomationModule);

_module = ZMEOpenWRT;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

ZMEOpenWRT.prototype.init = function (config) {
	ZMEOpenWRT.super_.prototype.init.call(this, config);

	var self = this;

	saveObject("timezone", this.config.timezone);
	saveObject("wan_port_access", this.config.wan_port_access);
}

ZMEOpenWRT.prototype.stop = function () {
	// unsign event handlers

	// detach handlers

	ZMEOpenWRT.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

