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
			
			self.matter.addEndPointSwitchBinary(ep);
			self.addEndpoint(ep, vDevT.id, self.binarySwitchGet, self.binarySwitchSet);
		}
		else if (vDevT.deviceType === "switchMultilevel" && (vDevT.probeType !== "motor") ) {
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
			if (vDevT.probeType === "door-window") {
				self.matter.addEndPointSensorContact(ep);
				self.addEndpoint(ep, vDevT.id, self.binarySensorGet, undefined, self.binarySensorPush);
			}
		}
	};

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
