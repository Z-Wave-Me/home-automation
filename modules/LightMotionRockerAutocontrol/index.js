/*** LightMotionRockerAutocontrol Z-Way Home Automation module *************************************

 Version: 1.0.1
 (c) Z-Wave.Me, 2014

 -----------------------------------------------------------------------------
 Author: Poltorak Serguei <ps@z-wave.me>
 Description:
	This module controls light via rocker, several motion sensors and light sensor.
	Light can be turned on and off by rocker (always) or by motion sensors
	(only if light level is high enough and manual control was not performed).
	A timer turns light off.

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function LightMotionRockerAutocontrol (id, controller) {
	// Call superconstructor first (AutomationModule)
	LightMotionRockerAutocontrol.super_.call(this, id, controller);

	// Light state
	this.lightIs = "unknown";
	
	// Timers
	this.rockerRelaxTimer = null;
	this.motionOffTimer = null;
	this.rescueOffTimer = null;
	
	// Prevent motion to trigger light after rocker operation
	this.rockerRelax = false;
	
	// States of all motion sensors
	this.motionsStates = {};
	
	// State of luminance sensor (true to allow trigger by motion)
	this.luminanceState = true;
};

inherits(LightMotionRockerAutocontrol, AutomationModule);

_module = LightMotionRockerAutocontrol;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

LightMotionRockerAutocontrol.prototype.init = function (config) {
	// Call superclass' init (this will process config argument and so on)
	LightMotionRockerAutocontrol.super_.prototype.init.call(this, config);

	var self = this;
	
	this.rockerHandler = function(vDev) {
		var event = vDev.get("metrics:level");
		
		if (event === "on") {
			self.turnLightsOn();		// Turn on light
			self.rockerRelaxTimerStart();	// Don't react on motion events for some period
			self.motionTimerStop();		// Stop motion timer if any
			self.rescueTimerStart();	// Run timer to turn off light if user forgot about it
		} else if (event === "off") {
			self.turnLightsOff();		// Turn off light
			self.rockerRelaxTimerStart();	// Don't react on motion events for some period
			self.motionTimerStop();		// Stop motion timer if any
			self.rescueTimerStop();		// Stop rescue timer
		}
	};

	this.motionHandler = function(vDev) {
		var level = vDev.get("metrics:level");
		if (level === "on") {
			self.motionsStates[vDev.id] = true;
			self.rescueTimerStart();	// Start rescue 
		} else if (level === "off") {
			self.motionsStates[vDev.id] = false;
		} else {
			return;				// Don't check motion states, unknown event
		}
		
		self.checkMotions();			// Check if all motion sensors are off
	};

	this.luminanceHandler = function(vDev) {
		if (self.config.luminanceThreshold > 0) {
			var _tmp = vDev.get("metrics:level") < self.config.luminanceThreshold;
			if (_tmp !== self.luminanceState) {
				self.luminanceState = _tmp;
				self.checkMotions();
			}
		}
	};
	
	this.config.rockers.forEach(function(rocker) {
		self.controller.devices.on(rocker, "change:metrics:level", self.rockerHandler);
	});
	
	this.config.motions.forEach(function(motion) {
		self.controller.devices.on(motion, "change:metrics:level", self.motionHandler);
	});
	
	if (this.config.luminance) {
		self.controller.devices.on(this.config.luminance, "change:metrics:level", self.luminanceHandler);
	}
	
	var vDevLumi = this.controller.devices.get(this.config.luminance);
	if (this.config.luminanceThreshold > 0 && vDevLumi) {
		this.luminanceState = vDevLumi.get("metrics:level") < this.config.luminanceThreshold;
	} else {
		this.luminanceState = true; // If no device found or luminanceThreshold = 0, always work on motion
	}
};

LightMotionRockerAutocontrol.prototype.stop = function () {
	LightMotionRockerAutocontrol.super_.prototype.stop.call(this);

	var self = this;
	
	this.config.rockers.forEach(function(rocker) {
		self.controller.devices.off(rocker, "change:metrics:level", self.rockerHandler);
	});
	
	this.config.motions.forEach(function(motion) {
		self.controller.devices.off(rocker, "change:metrics:level", self.motionHandler);
	});
	
	if (this.config.luminance) {
		self.controller.devices.off(this.config.luminance, "change:metrics:level", self.luminanceHandler);
	}
	
	if (this.rockerRelaxTimer) {
		clearTimeout(this.rockerRelaxTimer);
	}
	if (this.motionOffTimer) {
		clearTimeout(this.motionOffTimer);
	}
	if (this.rescueOffTimer) {
		clearTimeout(this.rescueOffTimer);
	}
};
// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

LightMotionRockerAutocontrol.prototype.checkMotions = function() {
	if (this.rockerRelax) {
		return;
	}
	
	var oneMotionIsOn = false;
	
	for (var vDevId in this.motionsStates) {
		oneMotionIsOn |= this.motionsStates[vDevId];
	};
	
	if (oneMotionIsOn && this.luminanceState) {
		this.turnLightsOn();
		self.rescueTimerStart();
		self.motionTimerStop();
	}

	if (!oneMotionIsOn || !this.luminanceState) {
		this.motionTimerStart();
	}
};

LightMotionRockerAutocontrol.prototype.turnLights = function(action) {
	var self = this;

	self.config.lights.forEach(function(device) {
		var vDev = self.controller.devices.get(device);
		if (vDev) {
			vDev.performCommand(action);
		}
	});
};

LightMotionRockerAutocontrol.prototype.turnLightsOn = function() {
	if (this.lightIs !== "on") {
		this.lightIs = "on";
		this.turnLights("on");
	}
};

LightMotionRockerAutocontrol.prototype.turnLightsOff = function() {
	if (this.lightIs !== "off") {
		this.lightIs = "off";
		this.turnLights("off");
	}
};

LightMotionRockerAutocontrol.prototype.rockerRelaxTimerStart = function() {
	var self = this;
	
	if (this.rockerRelaxTimer) {
		clearTimeout(this.rockerRelaxTimer);
		this.rockerRelaxTimer = null;
	}
	this.rockerRelaxTimer = setTimeout(function() {
		self.rockerRelax = false;
		self.rockerRelaxTimer = null;
	}, this.config.rockerRelaxTime * 1000);

	this.rockerRelax = true;
};

LightMotionRockerAutocontrol.prototype.rescueTimerStart = function() {
	var self = this;
	
	if (this.rescueOffTimer) {
		clearTimeout(this.rescueOffTimer);
		this.rescueOffTimer = null;
	}
	this.rescueOffTimer = setTimeout(function() {
		self.turnLightsOff();
		self.rescueOffTimer = null;
	}, this.config.rescueOffTimeout * 1000);
};

LightMotionRockerAutocontrol.prototype.motionTimerStart = function() {
	var self = this;
	
	if (this.motionOffTimer) {
		clearTimeout(this.motionOffTimer);
		this.motionOffTimer = null;
	}
	this.motionOffTimer = setTimeout(function() {
		self.turnLightsOff();
		self.rescueTimerStop();
		self.motionOffTimer = null;
	}, this.config.motionOffTimeout * 1000);
};

LightMotionRockerAutocontrol.prototype.rescueTimerStop = function() {
	if (this.rescueOffTimer) {
		clearTimeout(this.rescueOffTimer);
		this.rescueOffTimer = null;
	}
};

LightMotionRockerAutocontrol.prototype.motionTimerStop = function() {
	if (this.motionOffTimer) {
		clearTimeout(this.motionOffTimer);
		this.motionOffTimer = null;
	}
};
