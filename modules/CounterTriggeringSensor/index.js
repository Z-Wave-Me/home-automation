/*** Counter triggering binary sensor Z-Way HA module *******************************************

Version: 1.1.0
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Yurkin Vitaliy <aivs@z-wave.me>
Description: The module considers how many times have triggered the sensor. 
Used in the calculation of water flow.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function CounterTriggeringSensor (id, controller) {
	// Call superconstructor first (AutomationModule)
	CounterTriggeringSensor.super_.call(this, id, controller);
}

inherits(CounterTriggeringSensor, AutomationModule);
_module = CounterTriggeringSensor;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

CounterTriggeringSensor.prototype.init = function (config) {
	CounterTriggeringSensor.super_.prototype.init.call(this, config);

	var self = this;

	this.vDev = this.controller.devices.create({
		deviceId: "CounterTriggeringSensor_" + this.id,
		defaults: {
			deviceType: "sensorMultilevel",
			metrics: {
				level: this.config.initialValue,
				icon: "meter",
				title: self.getInstanceTitle()
			}
		},
		overlay: {
			metrics: {
				scaleTitle: this.config.scaleTitle
			}
		},
		handler: function(command, args) {console.log("CounterTriggeringSensor_" + this.id + " updated")},
		moduleId: this.id
	});


	// Plus 1, when binary sensor triggered
	this.handler = function (sensor) {
		if (sensor.get("metrics:level") === self.config.eventSensor) {
			var currentValue = parseFloat(self.vDev.get("metrics:level"));
			if (isNaN(currentValue)) {
					currentValue = 0;
			}
			currentValue = currentValue + self.config.valueToAdd
			self.vDev.set("metrics:level", currentValue);
		}
	}
	// Setup metric update event listener
	this.controller.devices.on(this.config.binarySensor, 'change:metrics:level', this.handler);
};

CounterTriggeringSensor.prototype.stop = function () {
	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
		this.vDev = null;
	}

	this.controller.devices.off(this.config.binarySensor, 'change:metrics:level', this.handler);

	CounterTriggeringSensor.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
