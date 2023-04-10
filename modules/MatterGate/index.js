/*** MatterGate Z-Way HA module *******************************************
 
Version: 1.0
(c) Z-Wave.Me, 2023
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
	This module announces Z-Way HA devices to Matter
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function MatterGate (id, controller) {
	// Call superconstructor first (AutomationModule)
	MatterGate.super_.call(this, id, controller);
};

inherits(MatterGate, AutomationModule);

_module = MatterGate;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

MatterGate.prototype.init = function (config) {
	// Call superclass' init (this will process config argument and so on)
	MatterGate.super_.prototype.init.call(this, config);

	var self = this;

	this.endpoints = {};
	
	if (!this.config.matterDevices) {
		this.config.matterDevices = {};
	}

	// If matterDevicesArray doesn't contain an vDevId, then remove it from the matterDevices
	Object.keys(this.config.matterDevices).forEach(function(vDevId) {
		if (self.config.matterDevicesArray.indexOf(vDevId) == -1) {
			delete self.config.matterDevices[vDevId];
		}
	});
	this.saveConfig();
	updateSkippedDevicesList();

	// define functions and helpers
	
	function onDeviceAddedCore(vDevT) {
		var controller = this.controller;
		
		// defaults
		vDevT.title = vDevT.title || vDevT.id;
		vDevT.manufacturer = vDevT.manufacturer || "Z-Wave.Me";
		vDevT.product = vDevT.product || vDevT.deviceType;
		vDevT.firmwareRevision = vDevT.firmwareRevision || zwayVersion.release;
		vDevT.serialNumber = vDevT.serialNumber || vDevT.id;

		// Skip widgets
		if (vDevT.permanently_hidden || !(vDevT.visibility) || (vDevT.probeType === "alarmSensor_general_purpose") || (vDevT.probeType === "thermostat_mode") || vDevT.tags.indexOf("matter-skip") !== -1 || (vDevT.deviceType === "thermostat" && vDevT.id.indexOf("ZWayVDev") === -1))
			return;

		// Supported widgets
		if (!((vDevT.deviceType === "switchBinary") || (vDevT.deviceType === "switchMultilevel") || (vDevT.deviceType === "sensorMultilevel") ||
		   (vDevT.deviceType === "sensorBinary") || (vDevT.deviceType === "doorlock") || (vDevT.deviceType === "switchRGBW") || (vDevT.deviceType === "thermostat")))
			return;

		var ep = self.addDevice(vDevT);

		if (vDevT.deviceType === "switchBinary") {
			// skip thermostat mode
			if (vDevT.id.slice(-2) === "64") return;
			
			/* TODO handle appearance
			var type = Matter.Services.Switch;
			if (vDevT.tags.indexOf("type-light") !== -1) type = Matter.Services.Lightbulb;
			if (vDevT.tags.indexOf("type-fan") !== -1) type = Matter.Services.Fan;
			*/

			self.matter.addEndPointSwitchBinary(ep);
			self.addEndpoint(ep, vDevT.id, self.binarySwitchGet, self.binarySwitchSet);
		}
		else if (vDevT.deviceType === "switchMultilevel" && (vDevT.probeType !== "motor") ) {
			// skip if related to switchRGB
			var rgbDevId;
			if (vDevT.id.slice(-2) === "38"){
				rgbDevId = vDevT.id.substring(0, vDevT.id.indexOf("-",vDevT.id.indexOf("-")+1)+1) + "51-rgb";
			}
			var match = rgbDevices.filter(function(el) { return el.id === rgbDevId; })[0];
			if (match) return;

			self.matter.addEndPointSwitchMultiLevel(ep);
			self.addEndpoint(ep, vDevT.id, self.multilevelSwitchGet, self.multilevelSwitchSet);
		}
		else if (vDevT.deviceType === "sensorMultilevel") {
			if (vDevT.probeType === "temperature" && (vDevT.scaleTitle === "°C" || vDevT.scaleTitle === "°F")) {
				self.matter.addEndPointSensorTemperature(ep, -99*100, 99*100);
				self.addEndpoint(ep, vDevT.id, self.multilevelSensor100Get);
			}
			else if (vDevT.probeType === "humidity" && vDevT.scaleTitle === "%") {
				self.matter.addEndPointSensorHumidity(ep, 0*100, 100*100);
				self.addEndpoint(ep, vDevT.id, self.multilevelSensor100Get);
			}
			else if (vDevT.probeType === "luminosity") {
				self.matter.addEndPointSensorLight(ep, 1, 10000);
				self.addEndpoint(ep, vDevT.id, self.multilevelSensorGet);
			}
		}
		else if (vDevT.deviceType === "sensorBinary") {
			if (vDevT.probeType === "motion") {
			}
			else if (vDevT.probeType === "door-window") {
				self.matter.addEndPointSensorContact(ep);
				self.addEndpoint(ep, vDevT.id, self.binarySensorGet, undefined, self.binarySensorPush);
			}
		}
		/*
		else if (vDevT.deviceType === "doorlock") {
			var service = accessory.addService(Matter.Services.LockMechanism, "Door Lock");

			service.addCharacteristic(Matter.Characteristics.Name, "string", vDevT.title);
			m.StateLevel = service.addCharacteristic(Matter.Characteristics.LockCurrentState, "uint8", {
				get: function() { var d = controller.devices.get(vDevT.id); return (!!d && d.get("metrics:level") === "close") ? 1 : 0; }
			});
			m.level = service.addCharacteristic(Matter.Characteristics.LockTargetState, "uint8", {
				get: function() { var d = controller.devices.get(vDevT.id); return (!!d && d.get("metrics:level") === "close") ? 1 : 0; },
				set: function(value) { var d = controller.devices.get(vDevT.id); if (d) d.performCommand(value ? "close" : "open"); }
			});
		}
		else if (vDevT.deviceType === "switchRGBW") {
			// Don't create rgbw widgets without brightness
			var brightnessDev = null;
			var brightnessDevId;
			if (vDevT.id.indexOf("RGB") === 0) {
				// RGB module
				var redDevice = self.controller.instances.filter(function(instance){return instance.id == vDevT.id.substring(4)})[0].params.red;
				var before = redDevice.indexOf("-")+1;
				var after = redDevice.indexOf("-",redDevice.indexOf("-")+1);
				brightnessDevId = redDevice.substring(0, before) + "1" + redDevice.substring(after);
				brightnessDev = self.controller.devices.get(brightnessDevId);
			}
			else {
				// Z-Wave Device
				brightnessDevId = vDevT.id.substring(0, vDevT.id.indexOf("-",vDevT.id.indexOf("-")+1)+1) + "38";
				brightnessDev = self.controller.devices.get(brightnessDevId);
			}
			if (!brightnessDev) return;

			var service = accessory.addService(Matter.Services.Lightbulb, "Multilevel Switch");

			service.addCharacteristic(Matter.Characteristics.Name, "string", vDevT.title);

			self.onDeviceWipedOut(brightnessDevId);

			m.level = service.addCharacteristic(Matter.Characteristics.On, "bool", {
				get: function() { var d = controller.devices.get(brightnessDevId); return (!!d && d.get("metrics:level")) ? true : false; },
				set: function(value) { var d = controller.devices.get(brightnessDevId); if (!!d) d.performCommand(value ? "on" : "off"); }
			});

			m.hue = service.addCharacteristic(Matter.Characteristics.Hue, "float", {
				get: function() { var d = controller.devices.get(vDevT.id); return !!d && parseFloat(hsv(d).h) || 0.0; },
				set: function(value) { var d = controller.devices.get(vDevT.id); if (!!d) exactColor(d, "Hue", value); }},
				undefined, {"unit":"arcdegrees", "maxValue":360, "minValue":0, "minStep":1}
			);

			m.saturation = service.addCharacteristic(Matter.Characteristics.Saturation, "float", {
				get: function() { var d = controller.devices.get(vDevT.id); return !!d && parseFloat(hsv(d).s) || 0.0; },
				set: function(value) { var d = controller.devices.get(vDevT.id); if (!!d) exactColor(d, "Saturation", value); }},
				undefined, {"unit":"percentage", "maxValue":100, "minValue":0, "minStep":1}
			);

			m.brightness = service.addCharacteristic(Matter.Characteristics.Brightness, "int", {
				get: function() { var d = controller.devices.get(brightnessDevId); if (!d) return 0; var value = d.get("metrics:level"); return value > 99 ? 99 : value || 0; },
				set: function(value) { var d = controller.devices.get(vDevT.id); if (!!d) { exactColor(d, "Brightness", value); var b = controller.devices.get(brightnessDevId); if (!!b) b.performCommand("exact", { level: value }); }}},
				undefined, {"unit":"percentage", "maxValue":99, "minValue":0, "minStep":1}
			);

			// dirty hack to handle in OnLevelChange, but not to create a Matter accessory
			if (brightnessDev) {
				self.mapping[brightnessDev.id] = {
					$accessory: m.$accessory,
					level: m.level,
					brightness: m.brightness
				};
			}
		}
		else if (vDevT.deviceType === "thermostat") {
			var service = accessory.addService(Matter.Services.Thermostat, "Thermostat");
			service.addCharacteristic(Matter.Characteristics.Name, "string", vDevT.title);
			var deviceID = vDevT.id.substring(vDevT.id.lastIndexOf("_")+1,vDevT.id.indexOf("-"));

			// If Matter thermostat already generated, exit.
			var match = thermostats.filter(function(el) { return el === deviceID; })[0];
			
			if (match) {
				self.onDeviceWipedOut(vDevT.id);
				return;
			}
			
			thermostats.push(deviceID);

			// Get all thermostat modes
			var thermostatModes = [1]; // For danfoss LC and Secure without ThermostatMode CC
			if (zway.devices[deviceID].ThermostatMode && zway.devices[deviceID].ThermostatMode.data.supported.value) {
				thermostatModes = Object.keys(zway.devices[deviceID].ThermostatMode.data).filter(function(mode) {return !isNaN(parseInt(mode))});
			}

			// Use in Matter only Off, Cool, Heat, Auto
			var supportedMatterModes = [0,1,2,3];
			var modes = [];
			supportedMatterModes.forEach(function(validMode) {
				thermostatModes.forEach(function(mode) {
					if (validMode == mode)
						modes.push(validMode);
					if (validMode == 3 && mode == 10)
						modes.push(validMode);
				});
			});

			// Remove mode 3 (Auto) if exist
			var modesWithOutAuto = modes.filter(function(mode) {return mode != 3});

			var currentMaxMode = Math.max.apply(null, modesWithOutAuto);
			var currentMinMode = Math.min.apply(null, modesWithOutAuto);

			var targetMaxMode = Math.max.apply(null, modes);
			var targetMinMode = Math.min.apply(null, modes);

			m.currentThermostatMode = service.addCharacteristic(Matter.Characteristics.CurrentHeatingCoolingState, "uint8",  {
				get: function() { return modesWithOutAuto.length > 1 ? getCurrentMode(deviceID) : modesWithOutAuto[0]; }},
				undefined, {"valid-values": modesWithOutAuto, "maxValue": currentMaxMode, "minValue": currentMinMode}
			);

			m.targetThermostatMode = service.addCharacteristic(Matter.Characteristics.TargetHeatingCoolingState, "uint8", {
				get: function() { return modesWithOutAuto.length > 1 ? getTargetMode(deviceID) : modesWithOutAuto[0];; },
				set: function(mode) { zway.devices[deviceID].ThermostatMode.Set(mode == 3 ? 10 : mode); }},
				undefined, {"valid-values": modes, "maxValue":targetMaxMode, "minValue":targetMinMode}
			);

			m.currentTemperature = service.addCharacteristic(Matter.Characteristics.CurrentTemperature, "float",  {
				get: function() { return getCurrentTemperature(deviceID); }},
				undefined, {"unit":"celsius", "maxValue":999, "minValue":-999, "minStep":0.1}
			);

			m.targetTemperature = service.addCharacteristic(Matter.Characteristics.TargetTemperature, "float", {
				get: function() { return getTargetTemperature(deviceID); },
				set: function(temperature) {
					if (modesWithOutAuto.length > 1)
						zway.devices[deviceID].ThermostatMode.Set(lastSupportedThermostatMode == 3 ? 10 : lastSupportedThermostatMode);
					else 
						lastSupportedThermostatMode = modesWithOutAuto[0];
					zway.devices[deviceID].ThermostatSetPoint.Set(lastSupportedThermostatMode, temperature);
				}},
				undefined, {"unit":"celsius", "maxValue":40, "minValue":5, "minStep":0.5}
			);

			// { 0:"Celsius", 1:"Fahrenheit" }
			service.addCharacteristic(Matter.Characteristics.TemperatureDisplayUnits, "uint8", 0,
				["pr", "pw", "ev"], {"valid-values":[0, 1], "maxValue":1, "minValue":0}
			);
		}
		else if (vDevT.probeType === "motor") {
			var service = accessory.addService(Matter.Services.WindowCovering, "Blind Control");
			service.addCharacteristic(Matter.Characteristics.Name, "string", vDevT.title);

			m.targetPosition = service.addCharacteristic(Matter.Characteristics.TargetPosition, "uint8", {
				get: function() { var d = controller.devices.get(vDevT.id); if (!d) return 0; var value = parseInt(d.get("metrics:level")); return value > 99 ? 99 : value || 0; },
				set: function(value) { var d = controller.devices.get(vDevT.id); if (d) d.performCommand("exact", { level: value }); }},
				undefined, {"unit":"percentage", "maxValue":99, "minValue":0, "minStep":1}
			);
			m.currentPosition = service.addCharacteristic(Matter.Characteristics.CurrentPosition, "uint8", {
				get: function() { var d = controller.devices.get(vDevT.id); if (!d) return 0; var value = parseInt(d.get("metrics:level")); return value > 99 ? 99 : value || 0; }},
				undefined, {"unit":"percentage", "maxValue":99, "minValue":0, "minStep":1}
			);
			m.positionState = service.addCharacteristic(Matter.Characteristics.PositionState, "uint8", {
				get: function() { return 2; }}, // Stopped
				undefined, {"valid-values":[0, 1, 2], "maxValue":2, "minValue":0}
			);
		}
		*/
	};

	/***************** THERMOSTAT HELPERS *****************/
	
	/*
	function getCurrentTemperature(deviceID) {
		var ccSensorMultilevel = zway.devices[deviceID].SensorMultilevel;
		if  (ccSensorMultilevel && ccSensorMultilevel.data[1] && ccSensorMultilevel.data[1].val && ccSensorMultilevel.data[1].val.value) {
			var temperature = ccSensorMultilevel.data[1].val.value;
			if (temperature >= -999 && temperature <= 999) {
				return temperature;
			}
			else {
				return 0;
			}
		}
		else {
			if (lastSupportedThermostatMode == 3){
				lastSupportedThermostatMode = 10;
			}
			else if (lastSupportedThermostatMode == 0) {
				lastSupportedThermostatMode = 1;
			}
			return zway.devices[deviceID].ThermostatSetPoint.data[lastSupportedThermostatMode].val.value;
		}
	};

	function getTargetTemperature(deviceID) {
		var targetTemperature;
		if (zway.devices[deviceID].ThermostatMode) {
			var mode = zway.devices[deviceID].ThermostatMode.data.mode.value;
			if (mode == 1 || mode == 2 || mode == 3) {
				targetTemperature = zway.devices[deviceID].ThermostatSetPoint.data[mode].val.value;
			}
			else {
				if (lastSupportedThermostatMode == 0) {
					targetTemperature = 10;
				}
				else {
					targetTemperature = zway.devices[deviceID].ThermostatSetPoint.data[lastSupportedThermostatMode == 3 ? 10 : lastSupportedThermostatMode].val.value;
				}
			}

			if (targetTemperature < 5)
				targetTemperature = 5;
			if (targetTemperature > 40)
				targetTemperature = 40;
		}
		else {
			targetTemperature = zway.devices[deviceID].ThermostatSetPoint.data[1].val.value; // Danfoss LC
		}

		return targetTemperature;
	};

	function getTargetMode(deviceID) {
		var mode = zway.devices[deviceID].ThermostatMode.data.mode.value;
		if (mode == 0 || mode == 1 || mode == 2 || mode == 3 || mode == 10) {
			lastSupportedThermostatMode = mode == 10 ? 3 : mode; // Transform ZW Auto(10) mode to Matter Auto(3) mode
		}
		return lastSupportedThermostatMode;
	}

	function getCurrentMode(deviceID) {
		var mode = zway.devices[deviceID].ThermostatMode.data.mode.value;
		if (mode == 0 || mode == 1 || mode == 2 || mode == 3 || mode == 10) {
			if (mode == 3 || mode == 10){
				lastSupportedThermostatMode = 1; // CurrentHeatingCoolingState not support Auto(10) mode, change it to Heat(1)
			}
			else {
				lastSupportedThermostatMode = mode;
			}
		}
		return lastSupportedThermostatMode;
	}
	*/

	/***************** RGB HELPERS *****************/
	
	/*
	function exactColor(vDev, valueName, value) {
		var match = rgbDevices.filter(function(el) { return el.id === vDev.id; })[0];

		// If vDev already in rgbDevices array, set propertie
		if (match) {
			if (valueName === "Hue") {
				match.hue = value;
				match.valueCount += 1;
			}
			else if (valueName === "Saturation") {
				match.saturation = value;
				match.valueCount += 1;
			}
			else if (valueName === "Brightness") {
				match.brightness = value;
			}

			// Wait 2 Characteristics: "Hue, Saturation" to exact color
			if (valueName !== "Brightness" && match.valueCount == 2) {
				match.valueCount = 0;
				var colors = hsv2rgb({h:match.hue, s:match.saturation, v:match.brightness});
				vDev.performCommand("exact", {red: colors.r, green: colors.g, blue: colors.b});
			}
		}
		// If vDev not in rgbDevices array, add vDev and set propertie
		else {
			var last = (rgbDevices.push({"id":vDev.id, hue: 0, saturation: 0, brightness: 100, valueCount:0}) - 1);
			if (valueName === "Hue") {
				rgbDevices[last].hue = value;
				rgbDevices[last].valueCount += 1;
			}
			else if (valueName === "Saturation") {
				rgbDevices[last].saturation = value;
				rgbDevices[last].valueCount += 1;
			}
			else if (valueName === "Brightness") {
				rgbDevices[last].brightness = value;
			}
		}
	}

	function hsv(vDev){
		return rgb2hsv({r:vDev.get("metrics:color:r"), g:vDev.get("metrics:color:g"), b:vDev.get("metrics:color:b")});
	}

	function hsv2rgb(obj) {
		// H: 0-360; S,V: 0-100; RGB: 0-255
		var r, g, b;
		var sfrac = obj.s / 100;
		var vfrac = obj.v / 100;

		if(sfrac === 0){
			var vbyte = Math.round(vfrac*255);
			return { r: vbyte, g: vbyte, b: vbyte };
		}

		var hdb60 = (obj.h % 360) / 60;
		var sector = Math.floor(hdb60);
		var fpart = hdb60 - sector;
		var c = vfrac * (1 - sfrac);
		var x1 = vfrac * (1 - sfrac * fpart);
		var x2 = vfrac * (1 - sfrac * (1 - fpart));
		switch(sector){
			case 0:
				r = vfrac; g = x2;	b = c;	  break;
			case 1:
				r = x1;	g = vfrac; b = c;	  break;
			case 2:
				r = c;	 g = vfrac; b = x2;	 break;
			case 3:
				r = c;	 g = x1;	b = vfrac;  break;
			case 4:
				r = x2;	g = c;	 b = vfrac;  break;
			case 5:
			default:
				r = vfrac; g = c;	 b = x1;	 break;
		}

		return { "r": Math.round(255 * r), "g": Math.round(255 * g), "b": Math.round(255 * b) };
	}

	function rgb2hsv(obj) {
		// RGB: 0-255; H: 0-360, S,V: 0-100
		var r = obj.r/255, g = obj.g/255, b = obj.b/255;
		var max, min, d, h, s, v;

		min = Math.min(r, Math.min(g, b));
		max = Math.max(r, Math.max(g, b));

		if (min === max) {
			// shade of gray
			return {h: 0, s: 0, v: r * 100};
		}

		var d = (r === min) ? g - b : ((b === min) ? r - g : b - r);
		h = (r === min) ? 3 : ((b === min) ? 1 : 5);
		h = 60 * (h - d/(max - min));
		s = (max - min) / max;
		v = max;
		return {"h": h, "s": s * 100, "v": v * 100};
	}
	*/

	function updateSkippedDevicesList() {
		// Add tag "matter-skip" for all skipped devices from config
		self.config.skippedDevices.forEach(function(vDevId) {
			delete self.config.matterDevices[vDevId];
			removeFromMatterDevicesArray(vDevId);
			var vDev = self.controller.devices.get(vDevId);
	  		if (vDev !== null && vDev.get("tags").indexOf("matter-skip") === -1 ) {
	  			vDev.addTag("matter-skip");
	  		}
		});
		self.saveConfig();

		// Remove tag "matter-skip" if device not in skipped list
		self.controller.devices.forEach(function(vDev) {
			if (vDev !== null 
				&& vDev.get("tags").indexOf("matter-skip") !== -1
				&& self.config.skippedDevices.indexOf(vDev.id) === -1) {
	  				vDev.removeTag("matter-skip");
	  		}
		});
	}

	function removeFromMatterDevicesArray(vDevid) {
		var index = self.config.matterDevicesArray.indexOf(vDevid);
		if  (index !== -1) {
			self.config.matterDevicesArray.splice(index, 1);
		}
	}

	this.matterDeviceRemove = function (vDevId) {
		// TODO call matter.remove			
	}

	this.onDeviceAdded = function (vDev) {
	   	console.log("Matter: added", vDev.id);
	   	
		onDeviceAddedCore(self.vDevToTemplate(vDev));
	}
	
	this.onDeviceRemoved = function (vDev) {
		console.log("Matter: removed", vDev.id);
			
		// TODO self.matter.setReachable(ep, m["reachable"]);
	}
	
	this.onDeviceWipedOut = function (vDevId) {
		console.log("Matter: wipe out", vDevId);
		
		self.matterDeviceRemove(vDevId);
		
		// update device tree
		// TODO self.matter.update();
	}
	
	this.onLevelChanged = function (vDev) {
		console.log("Matter: updated", vDev.id);
		
		self.devicePush(vDev.id);
	}

	this.onTagsChanged = function (vDev) {
		// Add tag "matter-skip" to skipped Devices list in config and remove device from Homekit
		if (vDev.get("tags").indexOf("matter-skip") !== -1 && self.config.skippedDevices.indexOf(vDev.id) === -1) {
			self.config.skippedDevices.push(vDev.id);
			delete self.config.matterDevices[vDev.id];
			removeFromMatterDevicesArray(vDev.id);
			self.saveConfig();
			self.onDeviceWipedOut(vDev.id);
	  	}

	  	// Remove tag "matter-skip" from skipped Devices list in config and add device to Homekit
	  	if (vDev.get("tags").indexOf("matter-skip") === -1 && self.config.skippedDevices.indexOf(vDev.id) !== -1) {
	  		var index = self.config.skippedDevices.indexOf(vDev.id);
			self.config.skippedDevices.splice(index, 1);
			self.saveConfig();
			self.onDeviceAdded(vDev);
	  	}
	}

	this.onPermanentlyHiddenChanged = function (vDev) {
		// Remove device from Homekit
		if (vDev.get("permanently_hidden") === true) {
			delete self.config.matterDevices[vDev.id];
			removeFromMatterDevicesArray(vDev.id);
			self.saveConfig();
			self.onDeviceWipedOut(vDev.id);
		}

		// Add device to Homekit
		if (vDev.get("permanently_hidden") === false) {
			self.saveConfig();
			self.onDeviceAdded(vDev);
		}

	}

	var rgbDevices = [];
	
	/*
	var thermostats = [];
	var lastSupportedThermostatMode = 1; // Default Heat
	*/

	var pin = this.config.pin; // if undefined or empty, will be autogenerated
	
	this.matter = new Matter(
		this.config.name, 
		function(arg) {
			debugPrint("Getter " + JSON.stringify(arg));
			var ep = parseInt(arg["end_point_id"], 10);
			var epObj = self.endpoints[ep];
			return !!epObj && epObj.getter.call(self, epObj.id);
		},
		function(arg) {
			debugPrint("Setter " + JSON.stringify(arg));
			var ep = parseInt(arg["end_point_id"], 10);
			var val = parseInt(arg["value_0"], 10);
			var epObj = self.endpoints[ep];
			return !!epObj && epObj.setter.call(self, epObj.id, val);
		}
		//,,
		//pin
	);

	// prepare the structure holders
	
	this.mapping = {}

	// load saved devices in case vDevs are not yet loaded to make sure Matter always receives the full list of device
	this.preloadDevices();

	// add existing devices
	this.controller.devices.each(function(d) { onDeviceAddedCore(self.vDevToTemplate(d)); });
	
	// listen for future device collection changes
	this.controller.devices.on("created", this.onDeviceAdded);
	this.controller.devices.on("removed", this.onDeviceRemoved);
	this.controller.devices.on("wipedOut", this.onDeviceWipedOut);
	this.controller.devices.on("change:metrics:level", this.onLevelChanged);
	this.controller.devices.on("change:metrics:isFailed", this.onLevelChanged);
	this.controller.devices.on("change:tags", this.onTagsChanged);
	this.controller.devices.on("change:permanently_hidden", this.onPermanentlyHiddenChanged);
	
	// update device tree
	//TODO//this.matter.update();
	
	console.log("Matter PIN:", this.matter.pin);
	self.config.pin = this.matter.pin;
	this.controller.addNotification("notification", "Matter PIN: " + this.matter.pin, "module", "MatterGate");
};

MatterGate.prototype.stop = function () {
	MatterGate.super_.prototype.stop.call(this);

	this.controller.devices.off("created", this.onDeviceAdded);
	this.controller.devices.off("removed", this.onDeviceRemoved);
	this.controller.devices.off("wipedOut", this.onDeviceWipedOut);
	this.controller.devices.off("change:metrics:level", this.onLevelChanged);
	this.controller.devices.off("change:metrics:isFailed", this.onLevelChanged);
	this.controller.devices.off("change:tags", this.onTagsChanged);
	this.controller.devices.off("change:permanently_hidden", this.onPermanentlyHiddenChanged);

	if (this.matter) {
		this.matter.stop();
	}
	
	delete this.endpoints;
	delete this.onDeviceAdded;
	delete this.onDeviceRemoved;
	delete this.onDeviceWipedOut;
	delete this.onLevelChanged;
	delete this.onTagsChanged;
	delete this.onPermanentlyHiddenChanged;
};


MatterGate.prototype.addDevice = function(vDevT) {
	var self = this;
	
	// clean old structure if any
	this.matterDeviceRemove(vDevT.id);
	
	if (!_.isEqual(_.omit(this.config.matterDevices[vDevT.id], "ep"), _.omit(vDevT, "ep"))) {
		var ep = (this.config.matterDevices[vDevT.id] && this.config.matterDevices[vDevT.id].ep) || (1 + Math.max(2, Math.max.apply(null, Object.keys(this.config.matterDevices).map(function(k) { return self.config.matterDevices[k].ep; }))));
		this.config.matterDevices[vDevT.id] = vDevT;
		if (this.config.matterDevicesArray.indexOf(vDevT.id) == -1)
			this.config.matterDevicesArray.push(vDevT.id);
		this.config.matterDevices[vDevT.id].ep = ep;
		this.saveConfig();
	}
	
	var ep = this.config.matterDevices[vDevT.id].ep;
	
	return ep;
};

MatterGate.prototype.preloadDevices = function() {
	var self = this;
	
	Object.keys(this.config.matterDevices).forEach(function(vDevId) {
		self.addDevice(self.config.matterDevices[vDevId]);
	});
};

MatterGate.prototype.vDevToTemplate = function(vDev) {
	return {
		id: vDev.id,
		deviceType: vDev.get("deviceType"),
		probeType: vDev.get("probeType"),
		tags: vDev.get("tags"),
		permanently_hidden: vDev.get('permanently_hidden'),
		visibility: vDev.get('visibility'),
		title: vDev.get("metrics:title"),
		scaleTitle: vDev.get("metrics:scaleTitle"),
		probeTitle: vDev.get("metrics:probeTitle"),
		manufacturer: vDev.get("manufacturer"),
		product: vDev.get("product"),
		firmwareRevision: vDev.get("firmware"),
		serialNumber: undefined
	};
};

MatterGate.prototype.addEndpoint = function(ep, id, getter, setter, pusher) {
	this.endpoints[ep] = {
		id: id,
		getter: getter,
		setter: setter,
		pusher: pusher
	};
};

MatterGate.prototype.epById = function(id) {
	for (var ep in this.endpoints) {
		if (this.endpoints[ep].id === id) {
			return parseInt(ep, 10);
		}
	};
	
	return null;
};

MatterGate.prototype.devicePush = function(id) {
	var ep = this.epById(id);
	if (!ep) return;
	
	var pusher = this.endpoints[ep].pusher;
	if (!pusher) return;
	
	pusher.call(this, id, ep);
};

// Getters and setters

MatterGate.prototype.binarySwitchGet = function(id) {
	var dev = this.controller.devices.get(id);
	if (!dev) return false;
	
	return dev.get("metrics:level") === "on" ? 0xFF : 0x00;
};

MatterGate.prototype.binarySwitchSet = function(id, value) {
        var dev = this.controller.devices.get(id);
        if (!dev) return false;

       	dev.performCommand(value ? "on" : "off");
       	return true;
};

MatterGate.prototype.multilevelSwitchGet = function(id) {
	var dev = this.controller.devices.get(id);
	if (!dev) return false;
	
	var level = dev.get("metrics:level") ;
	if (level === "on") level === 99;
	if (level === "off") level = 0;
	if (level < 0) level = 0;
	if (level >= 99) level = 100;
	return level;
};

MatterGate.prototype.multilevelSwitchSet = function(id, value) {
        var dev = this.controller.devices.get(id);
        if (!dev) return false;

       	dev.performCommand("exact", { level: value });
       	return true;
};

MatterGate.prototype.multilevelSensorGet = function(id) {
        var dev = this.controller.devices.get(id);
        if (!dev) return false;

        return Math.round(dev.get("metrics:level"));
};

MatterGate.prototype.multilevelSensor100Get = function(id) {
        var dev = this.controller.devices.get(id);
        if (!dev) return false;

        return Math.round(dev.get("metrics:level") * 100);
};

MatterGate.prototype.binarySensorGet = function(id) {
        var dev = this.controller.devices.get(id);
        if (!dev) return false;

        return dev.get("metrics:level") === "on" ? 0x01 : 0x00;
};

MatterGate.prototype.binarySensorPush = function(id, ep) {
        var dev = this.controller.devices.get(id);
        if (!dev) return;

        this.matter.setEndPointSensorContactState(ep, dev.get("metrics:level") === "on" ? 0x01 : 0x00);
};
