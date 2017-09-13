/*** CodeDevice Z-Way HA module *******************************************

Version: 1.1.0
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
	Implements virtual device based on JavaScript code
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function CodeDevice (id, controller) {
	// Call superconstructor first (AutomationModule)
	CodeDevice.super_.call(this, id, controller);
}

inherits(CodeDevice, AutomationModule);

_module = CodeDevice;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

CodeDevice.prototype.init = function (config) {
	CodeDevice.super_.prototype.init.call(this, config);

	var self = this,
		icon = "",
		level = "",
		scaleTitle = "",
		deviceType = this.config.deviceType;
		
	switch(deviceType) {
		case "sensorBinary":
			icon = self.config.iconSensorBinary;
			level = "off";
			break;
		case "sensorMultilevel":
			icon = self.config.iconSensorMultilevel;
			scaleTitle = this.config.scale_sensorMultilevel;
			level = 0;
			break;
		case "switchBinary":
			icon = "switch";
			level = "off";
			break;
		case "switchMultilevel":
			icon = "multilevel";
			level = 0;
			break;
		case "toggleButton":
			icon = "gesture";
			level = "on";
			break;
	}
	
	var defaults = {
		metrics: {
			title: self.getInstanceTitle()
		}
	};
 
	var overlay = {
			deviceType: deviceType,
			metrics: {
				icon: icon,
				level: level,
				scaleTitle: scaleTitle
			}	  
	};

	var vDev = self.controller.devices.create({
		deviceId: "Code_Device_" + deviceType + "_" + this.id,
		defaults: defaults,
		overlay: overlay,
		handler: function (command, args) {
			var vDevType = deviceType;

			if (command === "update" && (vDevType === "sensorBinary" || vDevType === "sensorMultilevel" || vDevType === "switchBinary" || vDevType === "switchMultilevel")) {
				self.update(this);
			}

			if (command === "on" && (vDevType === "toggleButton" || vDevType === "switchBinary")) {
				self.act(this, "On", null, (vDevType === "switchBinary" ? "on" : null));
			}


			if (command === "off" && vDevType === "switchBinary") {
				self.act(this, "Off", null, "off");
			}

			if ((command === "off" || command === "on" || command === "exact") && vDevType === "switchMultilevel") {
				var level = command === "exact" ? parseInt(args.level, 10) : (command === "on" ? 99 : 0);
				self.act(this, "Level", level, level);
			}
		},
		moduleId: this.id
	});
	
	if (vDev && this.config["getter_" + deviceType] && this.config["getterPollInterval_" + deviceType]) {
		this.timer = setInterval(function() {
			self.update(vDev);
		}, this.config["getterPollInterval_" + deviceType] * 1000);
	}
};

CodeDevice.prototype.stop = function () {
	if (this.timer) {
		clearInterval(this.timer);
	}
	
	this.controller.devices.remove("Code_Device_" + this.config.deviceType + "_" + this.id);
	
	CodeDevice.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

CodeDevice.prototype.update = function (vDev) {
	var deviceType = this.config.deviceType,
		getterCode = this.config["getter_" + deviceType];

	if (getterCode) {
		var newValue = eval(getterCode);
		if (this.config.skipEventIfSameValue !== true || newValue !== vDev.get("metrics:level")) {
			vDev.set("metrics:level", newValue);
		}
	}
};

CodeDevice.prototype.act = function (vDev, action, subst, selfValue) {
	var self = this,
		deviceType = this.config.deviceType,
		setterCode = this.config["setter" + action + "_" + deviceType];
	
	if (!!setterCode) {
		if (subst != null) {
			setterCode = setterCode.replace(/%%/g, subst);
		}
		eval(setterCode);
	}
	
	if ((!setterCode || this.config.updateOnAction === true) && selfValue !== null) {
		vDev.set("metrics:level", selfValue);
	}
};
