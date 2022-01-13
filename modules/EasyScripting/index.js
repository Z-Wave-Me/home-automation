/*** EasyScripting Z-Way HA module *******************************************

(c) Z-Wave.Me, 2021
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

	// make sure to hide all local variables in script execution
	var self = this;
	
	// helpers in script
	this.setHelpers();
	
	// extract events and the code
	this.code = this.config.script.split('\n').filter(function(s) { return !s.match(/^###/); }).join('\n');
	this.events = this.config.script.split('\n').filter(function(s) { return s.match(/^###/); }).map(function(s) { return s.match(/^###\W*([\w-]*)\W*/)[1]; });
	
	try {
		eval('this.script = function(global, vdev, setTimer, stopTimer, on, off) { "use strict";' + this.code + '};');
	} catch (e) {
		this.addNotification("error", e.toString(), "module");
		return;
	}
	
	this.onEvent = function() {
		if (self.running) {
			self.addNotification("error", "Loop detected", "module");
			return;
		}
		
		try {
			self.running = true;
			
			// make sure to hide outer scope variables and global variables
			var _script = self.script;
			(function(global, self, vdev, setTimer, stopTimer) {
				_script(global, vdev, setTimer, stopTimer, "on", "off");
			})(EasyScripting.globals, undefined, self.vDevHelper, self.setTimer, self.stopTimer);
		} finally {
			self.running = false;
		}
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

EasyScripting.prototype.setHelpers = function() {
	var self = this;
	
	var constr = this.constructor;
	
	// glabal.xxx in scrpits
	// create one static propery for globals
	if (!constr.globals) {
		constr.globals = {};
		constr.timers = {};
	}
	
	// Timers
	
	this.setTimer = function(name, func, timeout) {
		self.stopTimer(name);
		constr.timers[name] = setTimeout(func, timeout*1000);
	};
	this.stopTimer = function(name) {
		if (constr.timers[name]) {
			clearTimeout(constr.timers[name]);
		}
	};
	
	// VDev
	
	var vDevWrapper = function(vDevId) {
		this.dev = self.controller.devices.get(vDevId);
	};
	
	vDevWrapper.prototype.on = function() {
		this.dev.performCommand("on");
	};
	
	vDevWrapper.prototype.off = function() {
		this.dev.performCommand("off");
	};
	
	vDevWrapper.prototype.update = function() {
		this.dev.performCommand("update");
	};
	
	vDevWrapper.prototype.set = function(level) {
		this.dev.performCommand("exact", { level: level });
	};
	
	vDevWrapper.prototype.value = function() {
		return this.dev.get("metrics:level");
	};
	
	vDevWrapper.prototype.open = function() {
		this.dev.performCommand("open");
	};

	vDevWrapper.prototype.close = function() {
		this.dev.performCommand("close");
	};

	vDevWrapper.prototype.up = function() {
		this.dev.performCommand("up");
	};

	vDevWrapper.prototype.down = function() {
		this.dev.performCommand("down");
	};

	vDevWrapper.prototype.max = function() {
		this.dev.performCommand("max");
	};

	vDevWrapper.prototype.min = function() {
		this.dev.performCommand("min");
	};

	vDevWrapper.prototype.stop = function() {
		this.dev.performCommand("stop");
	};

	vDevWrapper.prototype.startUp = function() {
		this.dev.performCommand("startUp");
	};

	vDevWrapper.prototype.startDown = function() {
		this.dev.performCommand("startDown");
	};

	// export to local instance
	this.vDevHelper = function(vDevId) {
		return new vDevWrapper(vDevId);
	}
};

