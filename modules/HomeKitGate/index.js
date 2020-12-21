/*** HomeKitGate Z-Way HA module *******************************************
 
Version: 2.1.0
(c) Z-Wave.Me, 2020
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>, Yurkin Vitaliy <aivs@z-wave.me>
Description:
	This module announces Z-Way HA devices to HomeKit
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function HomeKitGate (id, controller) {
	// Call superconstructor first (AutomationModule)
	HomeKitGate.super_.call(this, id, controller);
};

inherits(HomeKitGate, AutomationModule);

_module = HomeKitGate;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

HomeKitGate.prototype.init = function (config) {
	// Call superclass' init (this will process config argument and so on)
	HomeKitGate.super_.prototype.init.call(this, config);

	var self = this;

	updateSkippedDevicesList();

	var rgbDevices = [];
	var thermostats = [];
	var lastSupportedThermostatMode = 1; // Default Heat

	this.hk = new HomeKit(this.config.name, function(r) {
		if (r.method == "GET" && r.path == "/accessories") {
			return this.accessories.serialize(r);
		} else if (r.method == "PUT" && r.path == "/characteristics" && r.data && r.data.characteristics) {
			r.data.characteristics.forEach(function (c) {
				if (typeof c.value !== "undefined") {
					// use c.aid, c.iid and c.value here
					var characteristic = this.accessories.find(c.aid, c.iid);
					if (characteristic)
						characteristic.value = c.value;

					// update subscribers
					this.update(c.aid, c.iid);
				}
				
				if (typeof c.ev === "boolean") {
					// set event subscription state
					r.events(c.aid, c.iid, c.ev);
				}
			}, this);
			return null; // 204
		} else if (r.method == "GET" && r.path.substring(0, 20) == "/characteristics?id=") {
			
			var self = this;
			// Array of characteristics to update
			var accessoriesCharacteristics = r.path.substring(20).split(',');
			var characteristics = [];
			accessoriesCharacteristics.forEach(function(item, i, arr) {
  				characteristicsItem = item.split('.').map(function(x) { return parseInt(x) });
  				var characteristic = self.accessories.find(characteristicsItem[0], characteristicsItem[1]);
  				if (characteristic) {
  					characteristics.push({ aid: characteristicsItem[0], iid: characteristicsItem[1], value: characteristic.value});
  				}
			});
			
			return {"characteristics": characteristics};
			
		} else if (r.path == "/identify") {
			console.log(this.name, "PIN:", this.pin);
			self.config.pin = this.pin;
			self.controller.addNotification("notification", "HomeKit PIN: " + this.pin, "module", "HomeKitGate");
		}
	});

	this.hk.accessories = new HKAccessoryCollection(this.hk);
	
	// add main accessory
	var razberryAccessory = this.hk.accessories.addAccessory("Z-Way", "Z-Wave.Me", "RaZberry", "0123456789", self.getAccessoryIdByVDevId("__RaZberry_Controller"));
	var razberryService = razberryAccessory.addService("49FB9D4D-0FEA-4BF1-8FA6-E7B18AB86DCE", "razberryService");
	razberryService.addCharacteristic(HomeKit.Characteristics.State, "uint8" , 0, ["pr", "ev"], {"maxValue":1, "minValue":0, "minStep":1});
	razberryService.addCharacteristic(HomeKit.Characteristics.Version, "string", "1.0", ["pr", "ev"]);
	razberryService.addCharacteristic(HomeKit.Characteristics.ControlPoint, "data", "", ["pr", "pw", "ev"]);

	this.mapping = {}

	var onDeviceAddedCore = function (vDev) {
		var deviceType = vDev.get("deviceType") || "virtualDevice";
		var probeType = vDev.get("probeType");

		// Skip widgets
		if (vDev.get('permanently_hidden') || !(vDev.get('visibility')) || (probeType === "alarmSensor_general_purpose") || (probeType === "thermostat_mode") || vDev.get("tags").indexOf("homekit-skip") !== -1 || (deviceType === "thermostat" && vDev.get("id").indexOf("ZWayVDev") === -1))
			return;

		// Supported widgets
		if (!((deviceType === "switchBinary") || (deviceType === "switchMultilevel") || (deviceType === "sensorMultilevel") ||
		   (deviceType === "sensorBinary") || (deviceType === "doorlock") || (deviceType === "switchRGBW") || (deviceType === "thermostat")))
			return;

		var title = vDev.get("metrics:title") || vDev.id;
		var manufacturer = "z-wave.me"; // todo

		var m = self.mapping[vDev.id] = {};
		var accessory = m.$accessory = self.hk.accessories.addAccessory(title, manufacturer, deviceType, vDev.id, self.getAccessoryIdByVDevId(vDev.id));

		if (deviceType === "switchBinary") {
			// skip thermostat mode
			if (vDev.id.slice(-2) === "64") return;

			var type = HomeKit.Services.Switch;
			if (vDev.get("tags").indexOf("type-light") !== -1) type = HomeKit.Services.Lightbulb;
			if (vDev.get("tags").indexOf("type-fan") !== -1) type = HomeKit.Services.Fan;
			
			var service = accessory.addService(type, "Binary Switch");

			service.addCharacteristic(HomeKit.Characteristics.Name, "string", vDev.get("metrics:title"));
			m.level = service.addCharacteristic(HomeKit.Characteristics.On, "bool", {
				get: function() { return vDev.get("metrics:level") === "on"; },
				set: function(value) { vDev.performCommand(value ? "on" : "off"); }
			});
		}
		else if (deviceType === "switchMultilevel" && (probeType !== "motor") ) {
			// skip if related to switchRGB
			var rgbDevId;
			if (vDev.id.slice(-2) === "38"){
				rgbDevId = vDev.id.substring(0, vDev.id.indexOf("-",vDev.id.indexOf("-")+1)+1) + "51-rgb";
			}
			var match = rgbDevices.filter(function(el) { return el.id === rgbDevId; })[0];
			if (match) return;

			var service = accessory.addService(HomeKit.Services.Lightbulb, "Multilevel Switch");

			service.addCharacteristic(HomeKit.Characteristics.Name, "string", vDev.get("metrics:title"));
			// necessary
			m.binaryLevel = service.addCharacteristic(HomeKit.Characteristics.On, "bool", {
				get: function() { return vDev.get("metrics:level") ? true : false; },
				set: function(value) { vDev.performCommand(value ? "on" : "off"); }
			});

			// optional
			m.level = service.addCharacteristic(HomeKit.Characteristics.Brightness, "int", {
				get: function() { var value = parseInt(vDev.get("metrics:level")); return value > 99 ? 99 : value || 0; },
				set: function(value) { vDev.performCommand("exact", { level: value }); }},
				undefined, {"unit":"percentage", "maxValue":99, "minValue":0, "minStep":1}
			);
		}
		else if (deviceType === "sensorMultilevel") {
			var service;
			if (probeType === "temperature" || vDev.get("metrics:scaleTitle") === "°C"){
				service = accessory.addService(HomeKit.Services.TemperatureSensor, "Temperature");
				m.level = service.addCharacteristic(HomeKit.Characteristics.CurrentTemperature, "float",  {
					get: function() {
						var temperature = parseFloat(vDev.get("metrics:level"));
						if (temperature >= -999 && temperature <= 999) {
							return temperature;
						}
						else {
							return 0;
						}
					}},
					undefined, {"unit":"celsius", "maxValue":999, "minValue":-999, "minStep":0.0001}
				);
			}
			else if (probeType === "humidity" || vDev.get("metrics:scaleTitle") === "%") {
				service = accessory.addService(HomeKit.Services.HumiditySensor, "Humidity");
				m.level = service.addCharacteristic(HomeKit.Characteristics.CurrentRelativeHumidity, "float",  {
					get: function() { return parseFloat(vDev.get("metrics:level")) || 0.0; }},
					undefined, {"unit":"percentage", "maxValue":100, "minValue":0, "minStep":0.0001}
				);
			}
			else {
				service = accessory.addService(HomeKit.Services.LightSensor, "LightSensor");
				m.level = service.addCharacteristic(HomeKit.Characteristics.CurrentAmbientLightLevel, "float",  {
					get: function() { return parseFloat(vDev.get("metrics:level")) || 0.0; }},
					undefined, {"maxValue":100000, "minValue":-100000, "minStep":0.0001}
				);
			}

			service.addCharacteristic(HomeKit.Characteristics.Name, "string", vDev.get("metrics:title"));
		}
		else if (deviceType === "sensorBinary") {
			var service;
			if (vDev.get("metrics:probeTitle") === "Motion") {
				service = accessory.addService(HomeKit.Services.MotionSensor, "Motion Sensor");
				// Contact Sensor Characteristic
				m.level = service.addCharacteristic(HomeKit.Characteristics.MotionDetected, "uint8", {
					get: function() { return vDev.get("metrics:level") === "on"; }
				});
			}
			else {
				service = accessory.addService(HomeKit.Services.ContactSensor, "Binary Sensor");
				// Contact Sensor Characteristic
				m.level = service.addCharacteristic(HomeKit.Characteristics.ContactSensorState, "uint8", {
					get: function() { return vDev.get("metrics:level") === "on"; }
				});
			}
			// Add Name
			service.addCharacteristic(HomeKit.Characteristics.Name, "string", vDev.get("metrics:title"));

			//serviceContactSensor.addCharacteristic(HomeKit.Characteristics.StatusLowBattery, ["pr", "ev"], "uint8", "Status Low Battery", 0);
		}
		else if (deviceType === "doorlock") {
			var service = accessory.addService(HomeKit.Services.LockMechanism, "Door Lock");

			service.addCharacteristic(HomeKit.Characteristics.Name, "string", vDev.get("metrics:title"));
			m.StateLevel = service.addCharacteristic(HomeKit.Characteristics.LockCurrentState, "uint8", {
				get: function() { return vDev.get("metrics:level") === "open" ? 0 : 1; }
			});
			m.level = service.addCharacteristic(HomeKit.Characteristics.LockTargetState, "uint8", {
				get: function() { return vDev.get("metrics:level") === "open" ? 0 : 1; },
				set: function(value) { vDev.performCommand(value ? "close" : "open"); }
			});
		}
		else if (deviceType === "switchRGBW") {
			// Don't create rgbw widgets without brightness
			var brightnessDev = null;
			if (vDev.id.indexOf("RGB") === 0) {
				// RGB module
				var redDevice = self.controller.instances.filter(function(instance){return instance.id == vDev.id.substring(4)})[0].params.red;
				var before = redDevice.indexOf("-")+1;
				var after = redDevice.indexOf("-",redDevice.indexOf("-")+1);
				brightnessDev = self.controller.devices.get(redDevice.substring(0, before) + "1" + redDevice.substring(after));
			}
			else {
				// Z-Wave Device
				brightnessDev = self.controller.devices.get(vDev.id.substring(0, vDev.id.indexOf("-",vDev.id.indexOf("-")+1)+1) + "38");
			}
			if (!brightnessDev) return;

			var service = accessory.addService(HomeKit.Services.Lightbulb, "Multilevel Switch");

			service.addCharacteristic(HomeKit.Characteristics.Name, "string", vDev.get("metrics:title"));

			self.onDeviceRemoved(brightnessDev);

			m.level = service.addCharacteristic(HomeKit.Characteristics.On, "bool", {
				get: function() { return brightnessDev.get("metrics:level") ? true : false; },
				set: function(value) { brightnessDev.performCommand(value ? "on" : "off"); }
			});

			m.hue = service.addCharacteristic(HomeKit.Characteristics.Hue, "float", {
				get: function() { return parseFloat(hsv(vDev).h) || 0.0; },
				set: function(value) { exactColor(vDev, "Hue" ,value); }},
				undefined, {"unit":"arcdegrees", "maxValue":360, "minValue":0, "minStep":1}
			);

			m.saturation = service.addCharacteristic(HomeKit.Characteristics.Saturation, "float", {
				get: function() { return parseFloat(hsv(vDev).s) || 0.0; },
				set: function(value) { exactColor(vDev, "Saturation" ,value); }},
				undefined, {"unit":"percentage", "maxValue":100, "minValue":0, "minStep":1}
			);

			m.brightness = service.addCharacteristic(HomeKit.Characteristics.Brightness, "int", {
				get: function() { var value = parseInt(brightnessDev.get("metrics:level")); return value > 99 ? 99 : value || 0; },
				set: function(value) { exactColor(vDev, "Brightness" ,value); brightnessDev.performCommand("exact", { level: value }); }},
				undefined, {"unit":"percentage", "maxValue":99, "minValue":0, "minStep":1}
			);

			// dirty hack to handle in OnLevelChange, but not to create a HK accessory
			if (brightnessDev) {
				self.mapping[brightnessDev.id] = {
					$accessory: m.$accessory,
					level: m.level,
					brightness: m.brightness
				};
			}
		}
		else if (deviceType === "thermostat") {
			var service = accessory.addService(HomeKit.Services.Thermostat, "Thermostat");
			service.addCharacteristic(HomeKit.Characteristics.Name, "string", vDev.get("metrics:title"));
			var deviceID = vDev.id.substring(vDev.id.lastIndexOf("_")+1,vDev.id.indexOf("-"));

			// If HK thermostat already generated, exit.
			var match = thermostats.filter(function(el) { return el === deviceID; })[0];
			
			if (match) {
				self.onDeviceRemoved(vDev);
				return;
			}
			
			thermostats.push(deviceID);

			// Get all thermostat modes
            var thermostatModes = [1]; // for danfoss lc without ThermostatMode
            if (zway.devices[deviceID].ThermostatMode)
            	thermostatModes = Object.keys(zway.devices[deviceID].ThermostatMode.data).filter(function(mode) {return !isNaN(parseInt(mode))});
			
			// Use in HK only Off, Cool, Heat, Auto
			var supportedHKModes = [0,1,2,3];
			var modes = [];
			supportedHKModes.forEach(function(validMode) {
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

			m.currentThermostatMode = service.addCharacteristic(HomeKit.Characteristics.CurrentHeatingCoolingState, "uint8",  {
				get: function() { return modesWithOutAuto.length > 1 ? getCurrentMode(deviceID) : modesWithOutAuto[0]; }},
				undefined, {"valid-values": modesWithOutAuto, "maxValue": currentMaxMode, "minValue": currentMinMode}
			);

			m.targetThermostatMode = service.addCharacteristic(HomeKit.Characteristics.TargetHeatingCoolingState, "uint8", {
				get: function() { return modesWithOutAuto.length > 1 ? getTargetMode(deviceID) : modesWithOutAuto[0];; },
				set: function(mode) { zway.devices[deviceID].ThermostatMode.Set(mode == 3 ? 10 : mode); }},
				undefined, {"valid-values": modes, "maxValue":targetMaxMode, "minValue":targetMinMode}
			);

			m.currentTemperature = service.addCharacteristic(HomeKit.Characteristics.CurrentTemperature, "float",  {
				get: function() { return getCurrentTemperature(deviceID); }},
				undefined, {"unit":"celsius", "maxValue":999, "minValue":-999, "minStep":0.1}
			);

			m.targetTemperature = service.addCharacteristic(HomeKit.Characteristics.TargetTemperature, "float", {
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
			service.addCharacteristic(HomeKit.Characteristics.TemperatureDisplayUnits, "uint8", 0,
				["pr", "pw", "ev"], {"valid-values":[0, 1], "maxValue":1, "minValue":0}
			);
		}
		else if (probeType === "motor") {
			var service = accessory.addService(HomeKit.Services.WindowCovering, "Blind Control");
			service.addCharacteristic(HomeKit.Characteristics.Name, "string", vDev.get("metrics:title"));

			m.targetPosition = service.addCharacteristic(HomeKit.Characteristics.TargetPosition, "uint8", {
				get: function() { var value = parseInt(vDev.get("metrics:level")); return value > 99 ? 99 : value || 0; },
				set: function(value) { vDev.performCommand("exact", { level: value }); }},
				undefined, {"unit":"percentage", "maxValue":99, "minValue":0, "minStep":1}
			);
			m.currentPosition = service.addCharacteristic(HomeKit.Characteristics.CurrentPosition, "uint8", {
				get: function() { var value = parseInt(vDev.get("metrics:level")); return value > 99 ? 99 : value || 0; }},
				undefined, {"unit":"percentage", "maxValue":99, "minValue":0, "minStep":1}
			);
			m.positionState = service.addCharacteristic(HomeKit.Characteristics.PositionState, "uint8", {
				get: function() { return 2; /* Stoped */ }},
				undefined, {"valid-values":[0, 1, 2], "maxValue":2, "minValue":0}
			);
		}
		// todo

		// add Bridging State Service to all Accessories
		var service = accessory.addService(HomeKit.Services.BridgingState, "BridgingState");
		service.addCharacteristic(HomeKit.Characteristics.Reachable, "bool", true, ["pr", "ev"]);
		service.addCharacteristic(HomeKit.Characteristics.LinkQuality, "uint8", 1, ["pr", "ev"], {"maxValue":4, "minValue":1, "minStep":1});
		service.addCharacteristic(HomeKit.Characteristics.AccessoryIdentifier, "string", generateUUID());
		service.addCharacteristic(HomeKit.Characteristics.Category, "uint16", 1, ["pr", "ev"], {"maxValue":16, "minValue":1, "minStep":1});
	};

	/***************** THERMOSTAT HELPERS *****************/
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
			lastSupportedThermostatMode = mode == 10 ? 3 : mode; // Transform ZW Auto(10) mode to HK Auto(3) mode
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

	/***************** RGB HELPERS *****************/
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

	function updateSkippedDevicesList() {
		// Add tag "homekit-skip" for all skipped devices from config
		self.config.skippedDevices.forEach(function(vDevId) {
			var vDev = self.controller.devices.get(vDevId);
	  		if (vDev !== null && vDev.get("tags").indexOf("homekit-skip") === -1 ) {
	  			vDev.addTag("homekit-skip");
	  		}
		});

		// Remove tag "homekit-skip" if device not in skipped list
		self.controller.devices.forEach(function(vDev) {
			if (vDev !== null 
				&& vDev.get("tags").indexOf("homekit-skip") !== -1
				&& self.config.skippedDevices.indexOf(vDev.id) === -1) {
	  				vDev.removeTag("homekit-skip");
	  		}
		});
	}

	var generateUUID = function (){
		return 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	}
	
	this.onDeviceAdded = function (vDev) {
	   	console.log("HK: added", vDev.id);
		onDeviceAddedCore(vDev);
	
		// update device tree
		self.hk.update();
	}
	
	this.onDeviceRemoved = function (vDev) {
		console.log("HK: removed", vDev.id);
		var m = self.mapping[vDev.id];
		if (m) {
			var accessory = m.$accessory;
			if (accessory)
				accessory.remove();
			
			delete self.mapping[vDev.id];
		}
		
		// update device tree
		self.hk.update();
	}
	
	this.onLevelChanged = function (vDev) {
		console.log("HK: updated", vDev.id);
		var m = self.mapping[vDev.id];
		if (!m) return;
		
		var accessory = m.$accessory;
		if (!accessory) return;
		
		for (var characteristicName in m) {
			// skip special names
			if (characteristicName[0] === "$") continue;
			self.hk.update(accessory.aid, m[characteristicName].iid);
		}
	}

	this.onTagsChanged = function (vDev) {
		// Add tag "homekit-skip" to skipped Devices list in config and remove device from Homekit
		if (vDev.get("tags").indexOf("homekit-skip") !== -1 && self.config.skippedDevices.indexOf(vDev.id) === -1) {
			self.config.skippedDevices.push(vDev.id);
			self.saveConfig();
			self.onDeviceRemoved(vDev);
	  	}

	  	// Remove tag "homekit-skip" from skipped Devices list in config and add device to Homekit
	  	if (vDev.get("tags").indexOf("homekit-skip") === -1 && self.config.skippedDevices.indexOf(vDev.id) !== -1) {
	  		var index = self.config.skippedDevices.indexOf(vDev.id);
			self.config.skippedDevices.splice(index, 1);
			self.saveConfig();
			self.onDeviceAdded(vDev);
	  	}
	}
	
	// add existing devices
	this.controller.devices.each(onDeviceAddedCore);
	
	// listen for future device collection changes
	this.controller.devices.on("created", this.onDeviceAdded);
	this.controller.devices.on("removed", this.onDeviceRemoved);
	this.controller.devices.on("change:metrics:level", this.onLevelChanged);
	this.controller.devices.on("change:tags", this.onTagsChanged);
	
	// update device tree
	this.hk.update();
	
	console.log("HomeKit PIN:", this.hk.pin);
	self.config.pin = this.hk.pin;
	this.controller.addNotification("notification", "HomeKit PIN: " + this.hk.pin, "module", "HomeKitGate");
};

HomeKitGate.prototype.stop = function () {
	HomeKitGate.super_.prototype.stop.call(this);

	this.controller.devices.off("created", this.onDeviceAdded);
	this.controller.devices.off("removed", this.onDeviceRemoved);
	this.controller.devices.off("change:metrics:level", this.onLevelChanged);
	this.controller.devices.off("change:tags", this.onTagsChanged);


	if (this.hk) {
		this.hk.stop();
	}
	
	delete this.mapping;
	delete this.onDeviceAdded;
	delete this.onDeviceRemoved;
	delete this.onLevelChanged;
};
// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

HomeKitGate.prototype.getAccessoryIdByVDevId = function(vDevId) {
	var self = this;

	if (!this.config.idMapping) {
		this.config.idMapping = {};
	}
	if (this.config.idMapping[vDevId] === undefined) {
		this.config.idMapping[vDevId] = 1 + Math.max(0, Math.max.apply(null, Object.keys(this.config.idMapping).map(function(k) { return self.config.idMapping[k]; })));
		this.saveConfig();
	}
	return this.config.idMapping[vDevId];
};
