/*** DummyDevice Z-Way HA module *******************************************

Version: 1.1.1
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>, Ray Glendenning <ray.glendenning@gmail.com>
Description:
	Creates a Dummy device
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function DummyDevice (id, controller) {
	// Call superconstructor first (AutomationModule)
	DummyDevice.super_.call(this, id, controller);
}

inherits(DummyDevice, AutomationModule);

_module = DummyDevice;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

DummyDevice.prototype.init = function (config) {
	DummyDevice.super_.prototype.init.call(this, config);

	var lastLevel = loadObject("DummyDevice_" + this.id + "_level");

	var self = this,
		icon = "",
		level = "",
		deviceType = this.config.deviceType;
		
	switch(deviceType) {
		case "switchBinary":
			icon = "switch";
			level = lastLevel || "off";
			break;
		case "switchMultilevel":
			icon = "multilevel";
			level = lastLevel || 0;
			break;
	}
	
	var defaults = {
		metrics: {
			title: self.getInstanceTitle(),
			icon: icon, // here to allow changing icon to custom one
			level: level // here to restore last value
		}
	};
 
	var overlay = {
			deviceType: deviceType // here to allow changing type
	};

	this.vDev = this.controller.devices.create({
		deviceId: this.getName() + "_" + this.id,
		defaults: defaults,
		overlay: overlay,
		handler: function(command, args) {
			
			if (command != 'update') {
				var level = command;
				
				if (this.get('deviceType') === "switchMultilevel") {
					if (command === "on") {
						level = 99;
					} else if (command === "off") {
						level = 0;
					} else {
						level = args.level;
					}
				}

				this.set("metrics:level", level);
				saveObject(this.id + "_level" , level); // not critical, allow lazy save
			}
		},
		moduleId: this.id
	});
};

DummyDevice.prototype.stop = function () {
	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
		this.vDev = null;
	}

	DummyDevice.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
