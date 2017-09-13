/*** TagOnOff Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
	Mark devices with On/Off tags depending on their state
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function TagOnOff (id, controller) {
	// Call superconstructor first (AutomationModule)
	TagOnOff.super_.call(this, id, controller);
}

inherits(TagOnOff, AutomationModule);

_module = TagOnOff;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

TagOnOff.prototype.init = function (config) {
	TagOnOff.super_.prototype.init.call(this, config);
	var self = this;

	this.controller.devices.forEach(function (vDev) {
		self.setTagOnOff(vDev);
	});
	
	this.handler = function(vDev) {
		self.setTagOnOff(vDev);
	};
	
	this.controller.devices.on('change:metrics:level', this.handler);
};

TagOnOff.prototype.stop = function () {
	var self = this;
	// Remove tags on and off
	this.controller.devices.forEach(function (vDev) {
		vDev.removeTag(self.config.tagOff);
		vDev.removeTag(self.config.tagOn);
	});
	
	this.controller.devices.off('change:metrics:level', this.handler);

	TagOnOff.super_.prototype.stop.call(this);
};

TagOnOff.prototype.setTagOnOff = function(vDev) {
	var type = vDev.get('deviceType'),
		level = vDev.get('metrics:level'),
		color = vDev.get('metrics:color')

	if (
		(type === 'switchBinary' && level === 'on') ||
		(type === 'switchMultilevel' && parseInt(level, 10) > 0) ||
		(type === 'switchRGBW' && level === 'on' && (color.r > 0 || color.g > 0 || color.b > 0))
	) {
		vDev.addTag(this.config.tagOn);
		vDev.removeTag(this.config.tagOff);
	}
	
	if (
		(type === 'switchBinary' && level === 'off') ||
		(type === 'switchMultilevel' && parseInt(level, 10) === 0) ||
		(type === 'switchRGBW' && (level === 'off' || (color.r === 0 && color.g === 0 && color.b === 0)))
	) {		
		vDev.removeTag(this.config.tagOn);
		vDev.addTag(this.config.tagOff);
	}
};
