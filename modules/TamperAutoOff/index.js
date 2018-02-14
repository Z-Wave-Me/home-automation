/*** TamperAutoOff Z-Way HA module *******************************************

Version: 1.1.0
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Yurkin Vitaliy <aivs@z-wave.me>
Description:
	Turn Off tamper widgets after 30 seconds

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function TamperAutoOff (id, controller) {
	// Call superconstructor first (AutomationModule)
	TamperAutoOff.super_.call(this, id, controller);

	// Create instance variables
	this.vDevsWithTimers = {};
};

inherits(TamperAutoOff, AutomationModule);

_module = TamperAutoOff;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

TamperAutoOff.prototype.init = function (config) {
	TamperAutoOff.super_.prototype.init.call(this, config);

	var self = this;

	this.handler = function (vDev) {
		var value = vDev.get("metrics:level");
		if (("on" === value || (parseInt(value) && value > 0)) && self.config.devices.indexOf(vDev.id) === -1) {
			// Device reported "on", set (or reset) timer to new timeout
			// If vDev exist
			if (self.vDevsWithTimers && self.vDevsWithTimers[vDev.id]) {
				// Timer is set, so we destroy it
				clearTimeout(self.vDevsWithTimers[vDev.id]);
				self.vDevsWithTimers[vDev.id] = null;
			}
			// Notice: self.config.timeout set in seconds
			(function(_vDev) {
				self.vDevsWithTimers[_vDev.id] = setTimeout(function () {
					// Timeout fired, so we send "off" command to the virtual device
					// Set tamper off for vDev or Z-Wave Device
					if ((id = _vDev.id.match("(ZWayVDev_([^_]+)_([0-9]+))-([0-9]+)-([0-9]+)-([0-9]+)")) === null) {
						_vDev.set("metrics:level", "off");
            			return;
        			} 
        			else {
        				zway.devices[parseInt(id[3])].instances[parseInt(id[4])].commandClasses[parseInt(id[5])].data[parseInt(id[6])].level.value = false;
        			}					
					// And clearing out this timer variable
					delete self.vDevsWithTimers[_vDev.id];
				}, self.config.timeout*1000);
			})(vDev)
		} else {
			// Turned off
			if (self.vDevsWithTimers[vDev.id]) {
				// Timer is set, so we destroy it
				clearTimeout(self.vDevsWithTimers[vDev.id]);
				delete self.vDevsWithTimers[vDev.id];
			}
		}
	};

	this.deviceCreated = function (vDev) {
		if (vDev.get("probeType") === "tamper") {
			self.controller.devices.on(vDev.id, 'change:metrics:level', self.handler);
		}
	}

	this.deviceRemoved = function (vDev) {
		if (vDev.get("probeType") === "tamper") {
			// Stop binding for device
			self.controller.devices.off(vDev.id, 'change:metrics:level', self.handler);
			// Remove device taimer
			if (self.vDevsWithTimers[vDev.id]) {
				// Timer is set, so we destroy it
				clearTimeout(self.vDevsWithTimers[vDev.id]);
				delete self.vDevsWithTimers[vDev.id];
			}
		}
	}

	// Bind to event "Added new device" -- > Bind to new device
	this.controller.devices.on('created', this.deviceCreated);   

	 // Bind to event "Removed device" --> Unbind device
	this.controller.devices.on('removed', this.deviceRemoved); 

	// If module started after devices created, pass all tampers and bind to them
	this.controller.devices.forEach(function(vDev, i, arr) {
		if (vDev.get("probeType") === "tamper") {
			self.controller.devices.on(vDev.id, 'change:metrics:level', self.handler);
		}
	});

};

TamperAutoOff.prototype.stop = function () {
	TamperAutoOff.super_.prototype.stop.call(this);
	var self = this;

	// Clear all timers
	for(var index in this.vDevsWithTimers) {
		clearTimeout(this.vDevsWithTimers[index]);
		delete self.vDevsWithTimers[index];
	}

	// At stop unbind from all Tampers
	this.controller.devices.forEach(function(vDev, i, arr) {
		if (vDev.get("probeType") === "tamper") {
			self.controller.devices.off(vDev.id, 'change:metrics:level', self.handler);
		}
	});
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
