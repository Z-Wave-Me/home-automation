/*** SwitchControlGenerator Z-Way HA module *******************************************

Version: 1.2.0
(c) Z-Wave.Me, 2020
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>, Niels Roche <nir@zwave.eu>
Description:
	Generates new widgets on the fly for Remote Switches and other devices sending control commands to controller
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SwitchControlGenerator (id, controller) {
	// Call superconstructor first (AutomationModule)
	SwitchControlGenerator.super_.call(this, id, controller);
}

inherits(SwitchControlGenerator, AutomationModule);

_module = SwitchControlGenerator;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SwitchControlGenerator.prototype.init = function (config) {
	SwitchControlGenerator.super_.prototype.init.call(this, config);

	var self = this;

	this.CC = {
		"Basic": 0x20,
		"SwitchBinary": 0x25,
		"SwitchMultilevel": 0x26,
		"SceneActivation": 0x2b,
		"SimpleAVControl": 0x94,
	};

	this.ZWAY_DEVICE_CHANGE_TYPES = {
		"DeviceAdded": 0x01,
		"DeviceRemoved": 0x02,
		"InstanceAdded": 0x04,
		"InstanceRemoved": 0x08,
		"CommandAdded": 0x10,
		"CommandRemoved": 0x20,
	};

	this.CL = {
		"Scenes": 0x05,
		"OnOff": 0x06,
		"LevelControl": 0x08,
	};

	this.ZBEE_DEVICE_CHANGE_TYPES = {
		"DeviceAdded": 0x01,
		"DeviceRemoved": 0x02,
		"EndPointAdded": 0x04,
		"EndPointRemoved": 0x08,
		"ClusterAdded": 0x10,
		"ClusterRemoved": 0x20,
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

	
	this.generated = this.config.generated; // used to stop after config changed
	
	// Z-Wave
	
	this.bindingsZWay = {};
		
	this.zwayReg = function (zwayName) {
		var zway = global.ZWave && global.ZWave[zwayName].zway;
		
		if (!zway) {
			return;
		}
		
		// create devices
		self.generated.filter(function(el) { return !!el && el.indexOf("ZWayVDev_" + zwayName + "_Remote_") === 0; }).forEach(function(name) {
			if (self.config.banned.indexOf(name) === -1) {

				var vendor = "",
					isFailed = false,
					ids = [],
					idString = "";
				try {
					ids = name.split('_').pop().split('-').slice(0, -1);
					idString = ids && ids.length > 0? " (" + ids.join(".") + ") " : idString;

					var v = zway.devices[ids[0]].data.vendorString.value;
					vendor = !!v? v : vendor;
					
					isFailed = zway.devices[ids[0]].data.isFailed.value;
				} catch (e) {}

				self.controller.devices.create({
					deviceId: name,
					defaults: {
						deviceType: name[name.length-1] === "S" ? "toggleButton" : "switchControl",
						metrics: {
							title: vendor + idString + "Button", // this is always not the initial creation, so the default title is already filled 
							change: "",
							isFailed: isFailed
						}
					},
					overlay: {
						metrics: {
							icon: "gesture",
							level: ""
						} 
					},
					handler: self.widgetHandler,
					moduleId: self.id
				});
			}
		});
				
		self.bindingsZWay[zwayName] = [];

		self.controller.emit("ZWave.dataBind", self.bindingsZWay[zwayName], zwayName, "lastExcludedDevice", function(type) {
			var _id = this.value;
			// remove vDev and cleanup vDev info
			self.generated.filter(function(el) { return !!el && el.indexOf("ZWayVDev_" + zwayName + "_Remote_" + _id) === 0; }).forEach(function(name) {
				self.controller.devices.remove(name);
				self.controller.devices.cleanup(name);
			});
			// remove from generated and banned lists
			self.generated = self.generated.filter(function(el) { return !!el && el.indexOf("ZWayVDev_" + zwayName + "_Remote_" + _id) !== 0; });
			self.config.generated = self.config.generated.filter(function(el) { return !!el && el.indexOf("ZWayVDev_" + zwayName + "_Remote_" + _id) !== 0; });
			self.config.banned = self.config.banned.filter(function(el) { return !!el && el.indexOf("ZWayVDev_" + zwayName + "_Remote_" + _id) !== 0; });
			self.saveConfig();
		}, "");

		var ctrlNodeId = zway.controller.data.nodeId.value,
			insts = zway.devices[ctrlNodeId].instances;
		for (var i in insts) {
			(function(n) {
				var dataB = insts[n].Basic && insts[n].Basic.data,
				    dataSB = insts[n].SwitchBinary && insts[n].SwitchBinary.data,
				    dataSML = insts[n].SwitchMultilevel && insts[n].SwitchMultilevel.data,
				    dataSc = insts[n].SceneActivation && insts[n].SceneActivation.data,
				    dataSAV = insts[n].SimpleAVControl && insts[n].SimpleAVControl.data;
			   
				if (dataB) {
					self.controller.emit("ZWave.dataBind", self.bindingsZWay[zwayName], zwayName, ctrlNodeId, n, self.CC["Basic"], "level", function(type) {
						if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
							self.remove("ZWay", zwayName, [dataB.srcNodeId.value, dataB.srcInstanceId.value, n, "B"]);
						} else {
							var val, par = {};
							
							if (this.value === 0) {
								val = "off";
							} else if (this.value === 255) {
								val = "on";
							} else {
								val = "exact";
								par = { level: this.value };
							}
							self.handler("ZWay", zwayName, val, par, [dataB.srcNodeId.value, dataB.srcInstanceId.value, n, "B"]);
						}
					}, "");
				}
				
				if (dataSB) {
					self.controller.emit("ZWave.dataBind", self.bindingsZWay[zwayName], zwayName, ctrlNodeId, n, self.CC["SwitchBinary"], "level", function(type) {
						if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
							self.remove("ZWay", zwayName, [dataSB.srcNodeId.value, dataSB.srcInstanceId.value, n, "B"]);
						} else {
							self.handler("ZWay", zwayName, this.value ? "on" : "off", {}, [dataSB.srcNodeId.value, dataSB.srcInstanceId.value, n, "B"]);
						}
					}, "");
				}
				
				if (dataSML) {
					self.controller.emit("ZWave.dataBind", self.bindingsZWay[zwayName], zwayName, ctrlNodeId, n, self.CC["SwitchMultilevel"], "level", function(type) {
						if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
							self.remove("ZWay", zwayName, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n, "B"]);
						} else {
							var val, par = {};
							
							if (this.value === 0) {
								val = "off";
							} else if (this.value === 255) {
								val = "on";
							} else {
								val = "exact";
								par = { level: this.value };
							}
							self.handler("ZWay", zwayName, val, par, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n, "B"]);
						}
					}, "");
					self.controller.emit("ZWave.dataBind", self.bindingsZWay[zwayName], zwayName, ctrlNodeId, n, self.CC["SwitchMultilevel"], "startChange", function(type) {
						if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
							self.remove("ZWay", zwayName, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n, "B"]);
						} else {
							self.handler("ZWay", zwayName, this.value ? "upstart" : "downstart", {}, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n, "B"]);
						}
					}, "");
					self.controller.emit("ZWave.dataBind", self.bindingsZWay[zwayName], zwayName, ctrlNodeId, n, self.CC["SwitchMultilevel"], "stopChange", function(type) {
						if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
							self.remove("ZWay", zwayName, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n, "B"]);
						} else {
							self.handler("ZWay", zwayName, dataSML.startChange.value ? "upstop" : "downstop", {}, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n, "B"]);
						}
					}, "");
				}
				
				if (dataSc) {
					self.controller.emit("ZWave.dataBind", self.bindingsZWay[zwayName], zwayName, ctrlNodeId, n, self.CC["SceneActivation"], "currentScene", function(type) {
						if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
							self.remove("ZWay", zwayName, [dataSc.srcNodeId.value, dataSc.srcInstanceId.value, n, this.value, "S"]);
						} else {
							self.handler("ZWay", zwayName, "on", {}, [dataSc.srcNodeId.value, dataSc.srcInstanceId.value, n, this.value, "S"]);
						}
					}, "");
				}
				
				if (dataSAV) {
					self.controller.emit("ZWave.dataBind", self.bindingsZWay[zwayName], zwayName, ctrlNodeId, n, self.CC["SimpleAVControl"], "key", function(type) {
						if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
							self.remove("ZWay", zwayName, [dataSAV.srcNodeId.value, dataSAV.srcInstanceId.value, n, this.value, "S"]);
						} else {
							self.handler("ZWay", zwayName, "on", {}, [dataSAV.srcNodeId.value, dataSAV.srcInstanceId.value, n, this.value, "S"]);
						}
					}, "");
				}
			})(i);
		}
	};
	
	this.zwayUnreg = function(zwayName) {
		// detach handlers
		if (self.bindingsZWay[zwayName]) {
			self.controller.emit("ZWave.dataUnbind", self.bindingsZWay[zwayName]);
		}
		// remove devices
		self.generated.filter(function(el) { return !!el && el.indexOf("ZWayVDev_" + zwayName + "_Remote_") === 0; }).forEach(function(name) {
			self.controller.devices.remove(name);
		});
		self.bindingsZWay[zwayName] = null;
		delete self.bindingsZWay[zwayName];
	};
	
	this.controller.on("ZWave.register", this.zwayReg);
	this.controller.on("ZWave.unregister", this.zwayUnreg);

	// walk through existing ZWave
	if (global.ZWave) {
		for (var name in global.ZWave) {
			this.zwayReg(name);
		}
	}
	
	// Zigbee
	
	this.bindingsZBee = {};
	
	this.zbeeReg = function (zbeeName) {
		var zbee = global.Zigbee && global.Zigbee[zbeeName].zbee;
		
		if (!zbee) {
			return;
		}
		
		// create devices
		self.generated.filter(function(el) { return !!el && el.indexOf("ZBeeVDev_" + zbeeName + "_Remote_") === 0; }).forEach(function(name) {
			if (self.config.banned.indexOf(name) === -1) {

				
				var vendor = "",
					isFailed = false,
					ids = [],
					idString = "";
				try {
					ids = name.split('_').pop().split('-').slice(0, -1);
					idString = ids && ids.length > 0? " (" + ids.join(".") + ") " : idString;

					if (zbee.devices[ids[0]].endpoints[1] && zbee.devices[ids[0]].endpoints[1].Basic) {
						var v = zbee.devices[ids[0]].endpoints[1].Basic.data.manufacturerName.value;
						vendor = !!v? v : vendor;
					}
					
					isFailed = zbee.devices[ids[0]].data.isFailed.value;
				} catch (e) {}

				self.controller.devices.create({
					deviceId: name,
					defaults: {
						deviceType: name[name.length-1] === "S" ? "toggleButton" : "switchControl",
						metrics: {
							title: vendor + idString + "Button", // this is always not the initial creation, so the default title is already filled 
							change: "",
							isFailed: isFailed
						}
					},
					overlay: {
						metrics: {
							icon: "gesture",
							level: ""
						} 
					},
					handler: self.widgetHandler,
					moduleId: self.id
				});
			}
		});
				
		self.bindingsZBee[zbeeName] = [];

		self.controller.emit("Zigbee.dataBind", self.bindingsZBee[zbeeName], zbeeName, "lastExcludedDevice", function(type) {
			var _id = this.value;
			// remove vDev and cleanup vDev info
			self.generated.filter(function(el) { return !!el && el.indexOf("ZBeeVDev_" + zbeeName + "_Remote_" + _id) === 0; }).forEach(function(name) {
				self.controller.devices.remove(name);
				self.controller.devices.cleanup(name);
			});
			// remove from generated and banned lists
			self.generated = self.generated.filter(function(el) { return !!el && el.indexOf("ZBeeVDev_" + zbeeName + "_Remote_" + _id) !== 0; });
			self.config.generated = self.config.generated.filter(function(el) { return !!el && el.indexOf("ZBeeVDev_" + zbeeName + "_Remote_" + _id) !== 0; });
			self.config.banned = self.config.banned.filter(function(el) { return !!el && el.indexOf("ZBeeVDev_" + zbeeName + "_Remote_" + _id) !== 0; });
			self.saveConfig();
		}, "");

		var ctrlNodeId = zbee.controller.data.nodeId.value,
			insts = zbee.devices[ctrlNodeId].endpoints;
		for (var i in insts) {
			(function(n) {
				var dataOnOff = insts[n].OnOff && insts[n].OnOff.data,
				    dataLevel = insts[n].LevelControl && insts[n].LevelControl.data,
				    dataScenes = insts[n].Scene && insts[n].Scenes.data;
			   
				if (dataOnOff) {
					self.controller.emit("Zigbee.dataBind", self.bindingsZBee[zbeeName], zbeeName, ctrlNodeId, n, self.CL["OnOff"], "onOff", function(type) {
						if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
							self.remove("ZBee", zbeeName, [dataOnOff.srcNodeId.value, dataOnOff.srcEndpointId.value, n, "OnOff", "B"]);
						} else {
							self.handler("ZBee", zbeeName, this.value ? "on" : "off", {}, [dataOnOff.srcNodeId.value, dataOnOff.srcEndpointId.value, n, "OnOff", "B"]);
						}
					}, "");
				}
				
				if (dataLevel) {
					self.controller.emit("Zigbee.dataBind", self.bindingsZBee[zbeeName], zbeeName, ctrlNodeId, n, self.CL["LevelControl"], "currentLevel", function(type) {
						if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
							self.remove("ZBee", zbeeName, [dataLevel.srcNodeId.value, dataLevel.srcEndpointId.value, n, "Level", "B"]);
						} else {
							var val, par = {};
							
							if (this.value === 0) {
								val = "off";
							} else if (this.value === 254) { // OnOff max value is 254
								val = "on";
							} else {
								val = "exact";
								par = { level: this.value * 99 / 254 };
							}
							self.handler("ZBee", zbeeName, val, par, [dataLevel.srcNodeId.value, dataLevel.srcEndpointId.value, n, "Level", "B"]);
						}
					}, "");
					self.controller.emit("Zigbee.dataBind", self.bindingsZBee[zbeeName], zbeeName, ctrlNodeId, n, self.CL["LevelControl"], "startChange", function(type) {
						if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
							self.remove("ZBee", zbeeName, [dataLevel.srcNodeId.value, dataLevel.srcEndpointId.value, n, "Level", "B"]);
						} else {
							self.handler("ZBee", zbeeName, this.value ? "upstart" : "downstart", {}, [dataLevel.srcNodeId.value, dataLevel.srcEndpointId.value, n, "Level", "B"]);
						}
					}, "");
					self.controller.emit("Zigbee.dataBind", self.bindingsZBee[zbeeName], zbeeName, ctrlNodeId, n, self.CL["LevelControl"], "stopChange", function(type) {
						if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
							self.remove("ZBee", zbeeName, [dataLevel.srcNodeId.value, dataLevel.srcEndpointId.value, n, "Level", "B"]);
						} else {
							self.handler("ZBee", zbeeName, dataLevel.startChange.value ? "upstop" : "downstop", {}, [dataLevel.srcNodeId.value, dataLevel.srcEndpointId.value, n, "Level", "B"]);
						}
					}, "");
				}
				
				if (dataScenes) {
					self.controller.emit("Zigbee.dataBind", self.bindingsZBee[zbeeName], zbeeName, ctrlNodeId, n, self.CL["Scenes"], "currentScene", function(type) {
						if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
							self.remove("ZBee", zbeeName, [dataScenes.srcNodeId.value, dataScenes.srcEndpointId.value, n, this.value, "S", "S"]);
						} else {
							self.handler("ZBee", zbeeName, "on", {}, [dataScenes.srcNodeId.value, dataScenes.srcEndpointId.value, n, this.value, "S", "S"]);
						}
					}, "");
				}
			})(i);
		}
	};
	
	this.zbeeUnreg = function(zbeeName) {
		// detach handlers
		if (self.bindingsZBee[zbeeName]) {
			self.controller.emit("Zigbee.dataUnbind", self.bindingsZBee[zbeeName]);
		}
		// remove devices
		self.generated.filter(function(el) { return !!el && el.indexOf("ZBeeVDev_" + zbeeName + "_Remote_") === 0; }).forEach(function(name) {
			self.controller.devices.remove(name);
		});
		self.bindingsZBee[zbeeName] = null;
		delete self.bindingsZBee[zbeeName];
	};
	
	this.controller.on("Zigbee.register", this.zbeeReg);
	this.controller.on("Zigbee.unregister", this.zbeeUnreg);

	// walk through existing Zigbee
	if (global.Zigbee) {
		for (var name in global.Zigbee) {
			this.zbeeReg(name);
		}
	}
	
	this.api = function(zPrefix, zName /* srcNodeId, srcInstanceId, dstInstanceId, [sceneId], type */) {
		var _trapNew = self.config.trapNew;
		self.config.trapNew = true; // to force creation of new elements even if not allowed to do it on event trap
		self.handler(zPrefix, zName, "", {}, Array.prototype.slice.call(arguments, 1));
		self.config.trapNew = _trapNew;
	};
	
	this.controller.on("SwitchControlGenerator.register", this.api);
}

SwitchControlGenerator.prototype.stop = function () {
	// unsign event handlers
	this.controller.off("ZWave.register", this.zwayReg);
	this.controller.off("ZWave.unregister", this.zwayUnreg);
	
	this.controller.off("Zigbee.register", this.zwayReg);
	this.controller.off("Zigbee.unregister", this.zwayUnreg);
	
	this.controller.off("SwitchControlGenerator.register", this.api);

	// detach handlers
	for (var name in this.bindingsZWay) {
		this.controller.emit("ZWave.dataUnbind", this.bindingsZWay[name]);
	}
	
	this.bindingsZWay = {};
	
	// detach handlers
	for (var name in this.bindingsZBee) {
		this.controller.emit("Zigbee.dataUnbind", this.bindingsZBee[name]);
	}
	
	this.bindingsZBee = {};

	var self = this;
	
	// remove devices
	if (this.generated) {
		this.generated.forEach(function(name) {
			self.controller.devices.remove(name);
		});
		this.generated = [];
	}

	SwitchControlGenerator.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

SwitchControlGenerator.prototype.widgetHandler = function(command, params) {
	if (command === "on" || command === "off") {
		this.set("metrics:level", command);
	}
	if (command === "exact") {
		this.set("metrics:level", params.level);
	}
	if (command === "upstart" || command === "upstop" || command === "downstart" || command === "downstop") {
		this.set("metrics:change", command);
	}
};

SwitchControlGenerator.prototype.handler = function(zPrefix, zName, cmd, par, ids) {
	var postfix = ids.join("-"),
		type = ids[ids.length - 1],
		name = zPrefix + "VDev_" + zName + "_Remote_" + postfix;
		
	if (this.config.generated.indexOf(name) === -1) {
		if (!this.config.trapNew || this.config.banned.indexOf(name) !== -1) {
			return;
		}

		var vendor = "";
		var isFailed = false;

		if (zPrefix === "ZWay") {
			try {
				var v = global.ZWave[zName].zway.devices[ids[0]].data.vendorString.value;
				vendor = !!v? v : vendor;
			} catch (e) {}
			
			try {
				isFailed = global.ZWave[zName].zway.devices[ids[0]].data.isFailed.value;
			} catch (e) {}
		}
		
		if (zPrefix === "ZBee") {
			try {
				var v = global.Zigbee[zName].zbee.devices[ids[0]].endpoints[1].Basic.data.manufacturerName.value;
				vendor = !!v? v : vendor;
			} catch (e) {}
			
			try {
				isFailed = global.Zigbee[zName].zbee.devices[ids[0]].data.isFailed.value;
			} catch (e) {}
		}
		
		this.controller.devices.create({
			deviceId: name,
			defaults: {
				deviceType: type === "S" ? "toggleButton" : "switchControl",
				metrics: {
					title: vendor + " (" + ids.slice(0, -1).join(".") + ") Button",
					change: "",
					isFailed: isFailed
				}
			},
			overlay: {
				metrics: {
					icon: "gesture",
					level: ""
				} 
			},
			handler: this.widgetHandler,
			moduleId: this.id
		});
		
		this.config.generated.push(name);
		this.generated = this.config.generated;
		this.saveConfig();
	}

	var vDev = this.controller.devices.get(name);
	
	if (vDev === null) {
		var langFile = this.loadModuleLang();
		this.addNotification("critical", langFile.err, "controller");
		return;
	}
	
	this.widgetHandler.call(vDev, cmd, par);
};

SwitchControlGenerator.prototype.remove = function(zPrefix, zName, ids) {
	var postfix = ids.join("-"),
		name = zPrefix + "VDev_" + zName + "_Remote_" + postfix;
		
	if (this.config.generated.indexOf(name) === -1) {
		this.controller.devices.remove(name);
	}
};
