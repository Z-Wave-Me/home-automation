/*** EasyScripting Z-Way HA module *******************************************

(c) Z-Wave.Me, 2019
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>, Yurkin Vitaliy <aivs@z-wave.me>
Description:
	Easy Scripting language for home automation scripts
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function EasyScripting (id, controller) {
	// Call superconstructor first (AutomationModule)
	EasyScripting.super_.call(this, id, controller);
}

inherits(EasyScripting, AutomationModule);

_module = EasyScripting;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

EasyScripting.prototype.init = function (config) {
	EasyScripting.super_.prototype.init.call(this, config);

	var self = this;

	this.setVDevHelper();
	
	// extract events and the code
	var code = this.config.script.split('\n').filter(function(s) { return !s.match(/^###/); }).join('\n');
	this.events = this.config.script.split('\n').filter(function(s) { return s.match(/^###/); }).map(function(s) { return s.match(/^###\W*([\w-]*)\W*/)[1]; });
	
	try {
		eval('this.script = function(vdev, on, off) { "use strict";' + code + '};');
	} catch (e) {
		this.addNotification("error", e.toString(), "module");
		return;
	}
	
	console.logJS(this.vDevHelper().value);
	this.onEvent = function() {
		if (self.running) {
			self.addNotification("error", "Loop detected", "module");
			return;
		}
		self.running = true;
		(function(vdev) {
			self.script(vdev, "on", "off");
		})(self.vDevHelper);
		self.running = false;
	};

	this.events.forEach(function(vDevId) {
		try {
			self.controller.devices.on(vDevId, "change:metrics:level", self.onEvent);
		} catch(e) {
			self.addNotification("error", e.toString(), "module");
		}
	});
};

EasyScripting.prototype.stop = function () {
	EasyScripting.super_.prototype.stop.call(this);
	
	var self = this;
	
	this.events.forEach(function(vDevId) {
		try {
			self.controller.devices.off(vDevId, "change:metrics:level", self.onEvent);
		} catch(e) {
		}
	});
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

EasyScripting.prototype.setVDevHelper = function() {
	var self = this;
	
	var vDevWrapper = function(vDevId) {
		this.dev = self.controller.devices.get(vDevId);
	};
	
	/*
	Not working
	vDevWrapper.prototype = {
		get val() {
			console.logJS("G". this.dev);
			return this.dev.get("metrics:level");
		},
		set val(v) {
			if (v == "on") this.on();
			else if (v == "off") this.off();
			else this.set(v);
		}
	};
	*/
	
	vDevWrapper.prototype.on = function() {
		this.dev.performCommand("on");
	};
	
	vDevWrapper.prototype.off = function() {
		this.dev.performCommand("off");
	};
	
	vDevWrapper.prototype.set = function(level) {
		this.dev.performCommand("exact", { level: level });
	};
	
	vDevWrapper.prototype.value = function() {
		return this.dev.get("metrics:level");
	};
	
	// export to local instance
	this.vDevHelper = function(vDevId) {
		return new vDevWrapper(vDevId);
	}
};
