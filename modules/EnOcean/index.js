/*** EnOcean Binding module ********************************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>
Copyright: (c) Z-Wave.Me, 2015

******************************************************************************/

function EnOcean (id, controller) {

	// if called without "new", return list of loaded EnOcean instances
	if (!(this instanceof EnOcean))
		return EnOcean.list();

	EnOcean.super_.call(this, id, controller);

	this.ENOCEAN_DEVICE_CHANGE_TYPES = {
		"DeviceAdded": 0x01,
		"DeviceRemoved": 0x02,
		"DeviceProfileChanged": 0x04,
		"ZDDXSaved": 0x100,
		"EnumerateExisting": 0x200
	};

	this.ZWAY_DATA_CHANGE_TYPE = {
		"Updated": 0x01,	   // Value updated or child created
		"Invalidated": 0x02,   // Value invalidated
		"Deleted": 0x03,	   // Data holder deleted - callback is called last time before being deleted
		"ChildCreated": 0x04,  // New direct child node created

		// ORed flags
		"PhantomUpdate": 0x40, // Data holder updated with same value (only updateTime changed)
		"ChildEvent": 0x80	 // Event from child node
	};
}

// Module inheritance and setup

inherits(EnOcean, AutomationModule);

_module = EnOcean;

Object.defineProperty(EnOcean, "list", {
	value: function () {
		return Object.keys(EnOcean);
	},
	enumerable: false,
	writable: false,  
	configurable: false 
});
ws.allowExternalAccess("EnOcean.list", controller.auth.ROLE.ADMIN);

EnOcean.prototype.init = function (config) {
	EnOcean.super_.prototype.init.call(this, config);

	var self = this;
	
	this.startBinding();
	if (!this.zeno) {
		return;
	}

	this.controller.on("EnOcean.dataBind", this._dataBind);
	this.controller.on("EnOcean.dataUnbind", this.dataUnbind);

	this.controller.emit("EnOcean.register", this.config.name);
};

EnOcean.prototype.startBinding = function () {
	var self = this,
		langFile = self.loadModuleLang();

	try {
		this.zeno = new EnoceanBinding(this.config.name, this.config.port, {
			configFolder: this.config.config || 'config',
			terminationCallback: function() {
				self.terminating.call(self);
			}
		});
		
		try {
			this.zeno.discover();
		} catch (e1) {
			this.zeno.stop();
			throw e1;
		}
	} catch(e) {
		this.addNotification("critical", langFile.err_binding_start + e.toString(), "enocean");
		this.zeno = null;
		return;
	}

	this.fastAccess = false;
	if (!global.zeno) {
		// this is the first zeno - make fast shortcut
		this.fastAccess = true;
	}

	global.EnOcean[this.config.name] = {
		"zeno": this.zeno,
		"port": this.config.port,
		"fastAccess": this.fastAccess
	};

	this.stopped = false;
	
	if (this.config.enableAPI !== false) {
		this.defineHandlers();
	}

	if (this.fastAccess) {
		if (this.config.enableAPI !== false) {
			this.externalAPIAllow();
		}
		global["zeno"] = this.zeno; // global variable
		global["EnOceanAPI"] = this.EnOceanAPI;
	}
	if (this.config.enableAPI !== false) {
		this.externalAPIAllow(this.config.name);
	}
	_.extend(global["EnOcean"][this.config.name], this.EnOceanAPI);

	if (this.config.createVDev !== false) {
		this.gateDevicesStart();
	}
	
	// save data every hour for hot start
	this.saveDataXMLTimer = setInterval(function() {
		self.zeno.devices.SaveData();
	}, 3600 * 1000);
};

EnOcean.prototype.stop = function () {
	console.log("--- EnOcean.stop()");
	EnOcean.super_.prototype.stop.call(this);

	this.stopBinding();

	this.controller.off("EnOcean.dataBind", this._dataBind);
	this.controller.off("EnOcean.dataUnbind", this.dataUnbind);
};

EnOcean.prototype.stopBinding = function () {
	this.controller.emit("EnOcean.unregister", this.config.name);
	
	if (this.config.createVDev !== false) {
		this.gateDevicesStop();
	}

	if (this.fastAccess) {
		if (this.config.enableAPI !== false) {
			this.externalAPIRevoke();
		}
		if (global.zeno) {
			delete global["zeno"];
			delete global["EnOceanAPI"];
		}
	}
	
	if (this.config.enableAPI !== false) {
		this.externalAPIRevoke(this.config.name);
	}
	if (global.EnOcean) {
		delete global.EnOcean[this.config.name];
	}

	if (this.saveDataXMLTimer) {
		clearInterval(this.saveDataXMLTimer);
		this.saveDataXMLTimer = undefined;
	}

	this.stopped = true;
	if (this.zeno) {
		try {
			this.zeno.stop();
		} catch(e) {
			// EnOcean has already gone
		}
		this.zeno = null;
	}
};

EnOcean.prototype.terminating = function () {
	if (!this.stopped) {
		console.log("Terminating EnOcean binding");
		this.stopBinding();

		var self = this;
		setTimeout(function() {
			// retry open after 5 seconds
			console.log("Restarting EnOcean binding");
			self.startBinding();
		}, 5000);
	}
};


// --------------- Public HTTP API -------------------


EnOcean.prototype.externalAPIAllow = function (name) {
	var _name = !!name ? ("EnOcean." + name) : "EnOceanAPI";

	ws.allowExternalAccess(_name, this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
	ws.allowExternalAccess(_name + ".Run", this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
	ws.allowExternalAccess(_name + ".Data", this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
};

EnOcean.prototype.externalAPIRevoke = function (name) {
	var _name = !!name ? ("EnOcean." + name) : "EnOceanAPI";

	ws.revokeExternalAccess(_name);
	ws.revokeExternalAccess(_name + ".Run");
	ws.revokeExternalAccess(_name + ".Data");
};

EnOcean.prototype.defineHandlers = function () {
	var zeno = this.zeno;

	this.EnOceanAPI = function() {
		return { status: 400, body: "Bad EnOceanAPI request " };
	};

	this.EnOceanAPI.Run = function(url) {
		url = "with(zeno) { " + url.substring(1) + " }";
		try {
			var r = eval(url);
			return {
				status: 200,
				headers: {
					"Content-Type": "application/json"
				},
				body: r
			};
		} catch (e) {
			return { status: 500, body: e.toString() };
		}
	};

	this.EnOceanAPI.Data = function(url) {
		var timestamp = parseInt(url.substring(1), 10) || 0;
		return {
			status: 200,
			headers: {
				"Content-Type": "application/json"
			},
			body: zeno.data(timestamp)
		};
	};
};


// ------------- Data Binding --------------

EnOcean.prototype._dataBind = function(dataBindings, zenoName, nodeId, path, func, type) {
	if (zenoName === this.config.name && self.zeno) {
		this.dataBind(dataBindings, this.zeno, nodeId, path, func, type);
	}
};

EnOcean.prototype.dataBind = function(dataBindings, zeno, nodeId, path, func, type) {
	var pathArr = [],
		data = zeno.devices[nodeId].data;

	if (path) {
		pathArr = path.split(".");
	}

	if (!func) {
		console.log("Function passed to dataBind is undefined");
		return;
	}

	while (pathArr.length) {
		data = data[pathArr.shift()];
		if (!data) {
			break;
		}
	}

	if (data) {
		dataBindings.push({
			"zeno": zeno,
			"nodeId": nodeId,
			"path": path,
			"func": data.bind(func, nodeId, false)
		});
		if (type === "value") {
			func.call(data, this.ZWAY_DATA_CHANGE_TYPE.Updated);
		}
	} else {
	 	console.log("Can not find data path:", nodeId, path);
	}
};

EnOcean.prototype.dataUnbind = function(dataBindings) {
	dataBindings.forEach(function (item) {
		if (item.zeno && item.zeno.devices[item.nodeId]) {
			var data = item.zeno.devices[item.nodeId].data,
				pathArr = item.path ? item.path.split(".") : [];

			while (pathArr.length) {
				data = data[pathArr.shift()];
				if (!data) {
					break;
				}
			}

			if (data) {
				data.unbind(item.func);
			} else {
				console.log("Can not find data path:", item.nodeId, item.path);
			}
		}
	});
	dataBindings = null;
};


// ----------------- Devices Creator ---------------

EnOcean.prototype.gateDevicesStart = function () {

	var self = this;

	this.gateDataBinding = [];

	// Bind to all future CommandClasses changes
	this.gateBinding = this.zeno.bind(function (type, nodeId) {
		if (type === self.ENOCEAN_DEVICE_CHANGE_TYPES["DeviceRemoved"] || type === self.ENOCEAN_DEVICE_CHANGE_TYPES["DeviceProfileChanged"]) {
			self.removeProfile(nodeId);
		}
		if (type === self.ENOCEAN_DEVICE_CHANGE_TYPES["DeviceAdded"] && self.zeno.devices[nodeId].data.funcId !== null && self.zeno.devices[nodeId].data.typeId !== null || type === self.ENOCEAN_DEVICE_CHANGE_TYPES["DeviceProfileChanged"]) {
			self.parseProfile(nodeId);
		}
		if (type === self.ENOCEAN_DEVICE_CHANGE_TYPES["DeviceAdded"]) {
			self.dataBind(self.gateDataBinding, self.zeno, nodeId, "channels", function(type) {
				if (type === self.ZWAY_DATA_CHANGE_TYPE["Updated"]) {
					self.parseGenericProfile(nodeId);
				}
			}, "value");
		}
	}, this.ENOCEAN_DEVICE_CHANGE_TYPES["DeviceAdded"] | this.ENOCEAN_DEVICE_CHANGE_TYPES["DeviceRemoved"] | this.ENOCEAN_DEVICE_CHANGE_TYPES["DeviceProfileChanged"] | this.ENOCEAN_DEVICE_CHANGE_TYPES["EnumerateExisting"]);
};

EnOcean.prototype.gateDevicesStop = function () {
	var self = this;
	
	// delete devices
	this.controller.devices.map(function (el) {
		return el.id;
	}).filter(function(el) {
		return el.indexOf("ZEnoVDev_" + self.config.name + "_") === 0;
	}).forEach(function(el) {
		self.controller.devices.remove(el);
	});
	
	// releasing bindings
	try {
		if (this.gateDataBinding) {
			this.dataUnbind(this.gateDataBinding);
		}
		if (this.zeno) {
			this.zeno.unbind(this.gateBinding);
		}
	} catch(e) {
		// EnOcean already gone, skip deallocation
		//this.zeno = null;
	}
};

EnOcean.prototype.removeProfile = function (nodeId) {
	var self = this;
	
	// delete devices
	this.controller.devices.map(function (el) {
		return el.id;
	}).filter(function(el) {
		return el.indexOf("ZEnoVDev_" + self.config.name + "_" + nodeId + "_") === 0;
	}).forEach(function(el) {
		self.controller.devices.remove(el);
	});
};

// EnOcean Equipment Profiles (EEP)
EnOcean.prototype.parseProfile = function (nodeId) {
	var self = this,
		deviceData = this.zeno.devices[nodeId].data,
		vDevIdPrefix = "ZEnoVDev_" + this.config.name + "_" + nodeId + "_";
		// vDev is not in this scope, but in {} scope for each type of device to allow reuse it without closures

	try {
		function matchDevice(rorg, funcId, typeId) {
			// deviceData is defined in outer scope
			return deviceData.rorg.value === rorg && deviceData.funcId.value === funcId && deviceData.typeId.value === typeId;
		}

		// below vDevIdPrefix and nodeId comes from this scope
		
		function binarySensor(dh, type, title, withTimeout, handler) {
			var vDev = self.controller.devices.create({
				deviceId: vDevIdPrefix + type,
				defaults: {
					deviceType: 'sensorBinary',
					metrics: {
						probeTitle: type,
						scaleTitle: '',
						icon: type,
						level: '',
						title: title
					}
				},
				overlay: {},
				handler: function(command) {},
				moduleId: self.id
			});
			
			if (vDev) {
				self.dataBind(self.gateDataBinding, self.zeno, nodeId, dh, function(type) {
					try {
						var val = this.value;
						if (handler) {
							val = handler(val);
							if (val === null) return; // don't hanlde if null
						}
						vDev.set("metrics:level", val ? "on" : "off");
						if (withTimeout && val) {
							setTimeout(function() {
								vDev.set("metrics:level", "off");
							}, 1000);
						}
					} catch (e) {}
				}, "value");
			}
		}

		function multilevelSensor(dh, type, scale, title) {
			var vDev = self.controller.devices.create({
				deviceId: vDevIdPrefix + type,
				defaults: {
					deviceType: "sensorMultilevel",
					metrics: {
						probeTitle: type,
						scaleTitle: scale,
						level: '',
						icon: type,
						title: title
					}
				},
				overlay: {},
				handler: function(command) {},
				moduleId: self.id
			});
			
			if (vDev) {
				self.dataBind(self.gateDataBinding, self.zeno, nodeId, dh, function(type) {
					try {
						vDev.set("metrics:level", this.value);
					} catch (e) {}
				}, "value");
			}
		}

		function rockerSwitch() {
			var vDevL = self.controller.devices.create({
				deviceId: vDevIdPrefix + "switch" + "_left",
				defaults: {
					deviceType: "switchControl",
					metrics: {
						level: '',
						icon: '',
						title: 'Left Rocker',
						change: ''
					}
				},
				overlay: {},
				handler: function(command) {
				},
				moduleId: self.id
			}),
			vDevR = self.controller.devices.create({
				deviceId: vDevIdPrefix + "switch" + "_right",
				defaults: {
					deviceType: "switchControl",
					metrics: {
						level: '',
						icon: '',
						title: 'Right Rocker',
						change: ''
					}
				},
				overlay: {},
				handler: function(command) {
					if (command === "on" || command === "off") {
						this.set("metrics:level", command);
					}
					if (command === "upstart" || command === "upstop" || command === "downstart" || command === "downstop") {
						this.set("metrics:change", command);
					}
				},
				moduleId: self.id
			}),
			dt = 500, // in ms
			timer = -1,
			leftPressed = false, rightPressed = false, leftUp = false, rightUp = false; // memorize pressed status
			
			if (vDevL && vDevR) {
				self.dataBind(self.gateDataBinding, self.zeno, nodeId, "energyBow", function(type) {
					if (deviceData.energyBow.value) {
						leftPressed = deviceData.value1.value < 2 || deviceData.secondAction.value && deviceData.value2.value < 2;
						leftUp = deviceData.value1.value === 1 || deviceData.secondAction.value && deviceData.value2.value === 1;
						rightPressed = deviceData.value1.value >= 2 || deviceData.secondAction.value && deviceData.value2.value >= 2;
						rightUp = deviceData.value1.value === 3 || deviceData.secondAction.value && deviceData.value2.value === 3;
						
						timer = setTimeout(function () {
							// timeout fired - this is a hold
							try{
								if (leftPressed) {
									vDevL.set("metrics:change", leftUp ? "upstart" : "downstart");
								}
								if (rightPressed) {
									vDevR.set("metrics:change", rightUp ? "upstart" : "downstart");
								}
							} catch (e) {}
							timer = -1; 
						}, dt);
					} else {
						var isHold = true;
						if (timer !== -1) {
							clearTimeout(timer);
							timer = -1;
							isHold = false;
						}
						try {
							if (isHold) {
								// release was long after press - this is a release
								if (leftPressed) {
									vDevL.set("metrics:change", leftUp ? "upstop" : "downstop");
								}
								if (rightPressed) {
									vDevR.set("metrics:change", rightUp ? "upstop" : "downstop");
								}
							} else {
								// release was short after press - this is a click
								if (leftPressed) {
									vDevL.set("metrics:level", leftUp ? "on" : "off");
								}
								if (rightPressed) {
									vDevR.set("metrics:level", rightUp ? "on" : "off");
								}
							}
						} catch (e) {}
					}
				}, "");
			}
		}

		function thermostat(dh, type, scale, title) {
			var vDev = self.controller.devices.create({
				deviceId: vDevIdPrefix + type,
				defaults: {
					deviceType: "thermostat",
					metrics: {
						scaleTitle: scale, // TODO!!! Check if F scale is defined in EnOcean
						level: '',
						min: 5,
						max: 40,
						icon: 'thermostat',
						title: title
					}
				},
				overlay: {},
				handler: function(command, args) {
					this.set("metrics:level", args.level);
				},
				moduleId: self.id
			});
			
			if (vDev) {
				self.dataBind(self.gateDataBinding, self.zeno, nodeId, dh, function(type) {
					try {
						vDev.set("metrics:level", this.value);
					} catch (e) {}
				}, "value");
			}
		}

		function binarySwitch(dh, type, title) {
			var vDev = self.controller.devices.create({
				deviceId: vDevIdPrefix + type,
				defaults: {
					deviceType: 'switchBinary',
					metrics: {
						icon: 'switch',
						level: '',
						title: title
					}
				},
				overlay: {},
				handler: function(command) {
					if (command === "on" || command === "off") {
						self.zeno.devices[nodeId].data[dh].value = command === "on" ? true : false;
						vDev.set("metrics:level", command);
					}
				},
				moduleId: self.id
			});
			
			if (vDev) {
				self.dataBind(self.gateDataBinding, self.zeno, nodeId, dh, function(type) {
					try {
						vDev.set("metrics:level", this.value ? "on" : "off");
					} catch (e) {}
				}, "value");
			}
		}

		if (matchDevice(0xf6, 0x02, 0x01)) {
			// Rocker
			rockerSwitch();
		}

		if (matchDevice(0xd5, 0x00, 0x01)) {
			// Door
			binarySensor("contact", "door", "Door Sensor");
		}
		
		if (matchDevice(0xf6, 0x10, 0x00)) {
			// Window
			binarySensor("open", "window", "Window Open Sensor");
			binarySensor("tilt", "window_tilt", "Window Tilt Sensor");
		}
		
		if (matchDevice(0xf6, 0x10, 0x01)) {
			// Window
			binarySensor("open", "window", "Window Open Sensor");
			binarySensor("tilt", "window_tilt", "Window Tilt Sensor");
		}
		
		if (matchDevice(0xa5, 0x04, 0x01)) {
			// Tempretature & Humidity
			multilevelSensor("humidity", "humidity", '%', "Humidity Sensor");
			if (deviceData.TSensor.value) {
				multilevelSensor("temperature", "temperature", '°C', "Temperature Sensor");
			}
		}

		if (matchDevice(0xa5, 0x06, 0x01)) {
			// Luminance
			multilevelSensor("illumination" + deviceData.rangeSelect.value.toString(), "luminance", 'lux', "Luminance");
		}

		if (matchDevice(0xa5, 0x02, 0x05)) {
			// Tempretature
			multilevelSensor("temperature", "temperature", '°C', "Temperature Sensor");
		}

		if (matchDevice(0xa5, 0x08, 0x01)) {
			// Motion, Luminance and Temperature Sensor
			multilevelSensor("illumination", "luminance", 'lux', "Luminance");
			multilevelSensor("temperature", "temperature", '°C', "Temperature Sensor");
			binarySensor("pir", "motion", "Motion Sensor", true);
		}
		
		if (matchDevice(0xa5, 0x09, 0x04)) {
			// CO2 & Tempretature & Humidity
			multilevelSensor("concentration", "co", 'ppm', "CO2 Sensor");
			if (deviceData.HSensor.value) {
				multilevelSensor("humidity", "humidity", '%', "Humidity Sensor");
						}
			if (deviceData.TSensor.value) {
				multilevelSensor("temperature", "temperature", '°C', "Temperature Sensor");
			}
		}

		if (matchDevice(0xa5, 0x10, 0x03)) {
			// Temperature Sensor, Set Point Control
			thermostat("setpoint", "heat", '°C', "Set Point Control");
			multilevelSensor("temperature", "temperature", '°C', "Temperature Sensor");
		}

		if (matchDevice(0xa5, 0x10, 0x05)) {
			// Temperature Sensor, Set Point and Occupancy Control
			thermostat("setpoint", "heat", '°C', "Set Point Control");
			multilevelSensor("temperature", "temperature", '°C', "Temperature Sensor");
			binarySensor("occupancy", "motion", "Motion Sensor");
		}

		if (matchDevice(0xa5, 0x10, 0x0a)) {
			// Temperature Sensor, Set Point Adjust and Single Input
			thermostat("setpoint", "heat", '°C', "Set Point Control");
			multilevelSensor("temperature", "temperature", '°C', "Temperature Sensor");
			binarySensor("contact", "door", "Door Sensor");
		}
		
		if (matchDevice(0xd2, 0x06, 0x10)) {
			// Door
			binarySensor("windowOpen", "door", "Door Sensor");
			binarySensor("preAlarm", "motion", "Pre Alarm");
			binarySensor("alarm", "alarm", "Alarm");
			binarySensor("preAlarmEnabled", "config1", "Pre Alarm");
			binarySwitch("setPreAlarm", "config2", "Set Pre Alarm");
			binarySwitch("setAlarm", "config3", "Set Alarm");
		}
		
		if (matchDevice(0xd2, 0x06, 0x11)) {
			// Door
			binarySensor("windowOpen", "door", "Door Sensor");
			binarySensor("windowTilt", "window_tilt", "Tilt Sensor", undefined, function(val) {
				switch(val) {
					case 0: return false; // treat unknow as non-tilted
					case 1: return true;
					case 2: return false;
					case 3: return null; // reserved - don't handle
				}
			});
			binarySensor("preAlarm", "motion", "Pre Alarm");
			binarySensor("alarm", "alarm", "Alarm");
			binarySensor("preAlarmEnabled", "config1", "Pre Alarm");
			binarySwitch("setPreAlarm", "config2", "Set Pre Alarm");
			binarySwitch("setAlarm", "config3", "Set Alarm");
		}
		
		if (matchDevice(0xd2, 0x06, 0xff)) {
			// Door // TODO(Rehau Smart Guard XT development sample - to be removed after Aug 2021)
			binarySensor("windowOpen", "door", "Door Sensor");
			binarySensor("windowTilt", "window_tilt", "Tilt Sensor");
			binarySensor("preAlarm", "motion", "Pre Alarm");
			binarySensor("alarm", "alarm", "Alarm");
			binarySensor("preAlarmEnabled", "config1", "Pre Alarm");
			binarySwitch("setPreAlarm", "config2", "Set Pre Alarm");
			binarySwitch("setAlarm", "config3", "Set Alarm");
		}
		
		// save ZDDX
		self.zeno.devices.SaveData();
		
		// handling of Signal Telegrams
		self.dataBind(self.gateDataBinding, self.zeno, nodeId, null, function(type) {
			if (self.zeno.devices[nodeId] && self.zeno.devices[nodeId].data["battery"] && !self.controller.devices.get(vDevIdPrefix + "battery")) {
				multilevelSensor("battery", "battery", '%', "Battery level");
				self.zeno.devices.SaveData(); // save ZDDX
			}
		}, "value");
	} catch (e) {
		var langFile = this.loadModuleLang(),
			values = nodeId + ": " + e.toString();
			
		this.addNotification("error", langFile.err_dev_create + values, "core");
		console.log(e.stack);
	}
};

// Enocean Generic Profile (GP)
EnOcean.prototype.parseGenericProfile = function (nodeId) {
	var self = this,
		deviceData = this.zeno.devices[nodeId].data,
		vDevIdPrefix = "ZEnoVDev_" + this.config.name + "_" + nodeId + "_";
		// vDev is not in this scope, but in {} scope for each type of device to allow reuse it without closures

	try {
		if (deviceData.rorg.value != 0xb0) return;
		
		function binarySensorGP(o, type, title) {
			var vDev = self.controller.devices.create({
				deviceId: vDevIdPrefix + type + "_" + o,
				defaults: {
					deviceType: 'sensorBinary',
					metrics: {
						probeTitle: type,
						scaleTitle: '',
						icon: type,
						level: '',
						title: title
					}
				},
				overlay: {},
				handler: function(command) {},
				moduleId: self.id
			});
			
			if (vDev) {
				self.dataBind(self.gateDataBinding, self.zeno, nodeId, "channels." + o + ".level", function(type) {
					try {
						vDev.set("metrics:level", this.value ? "on" : "off");
					} catch (e) {}
				}, "value");
			}
		}
		
		function binarySwitchGP(o, i, type, title) {
			var vDev = self.controller.devices.create({
				deviceId: vDevIdPrefix + type + "_" + o + "_" + i,
				defaults: {
					deviceType: 'switchBinary',
					metrics: {
						icon: 'switch',
						level: '',
						title: title
					}
				},
				overlay: {},
				handler: function(command) {
					if (command === "on" || command === "off") {
						self.zeno.devices[nodeId].data.channels[i].level.value = command === "on" ? true : false;
						// check if it reports back // vDev.set("metrics:level", command);
					}
				},
				moduleId: self.id
			});
			
			if (vDev) {
				self.dataBind(self.gateDataBinding, self.zeno, nodeId, "channels." + o + ".level", function(type) {
					try {
						vDev.set("metrics:level", this.value ? "on" : "off");
					} catch (e) {}
				}, "value");
			}
		}

		if (deviceData.manufacturerId.value == 0x02d && deviceData.productId.value == 0x08) {
			// Afriso siren
			binarySwitchGP("o1", "i1", "switch", "Siren");
			binarySwitchGP("o2", "i2", "switch", "Arm Status");
			binarySensorGP("o3", "alarm", "Power status");
		}
		
		// save ZDDX
		self.zeno.devices.SaveData();
	} catch (e) {
		var langFile = this.loadModuleLang(),
			values = nodeId + ": " + e.toString();
			
		this.addNotification("error", langFile.err_dev_create + values, "core");
		console.log(e.stack);
	}
};
