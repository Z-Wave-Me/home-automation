/*** Z-Wave Binding module ********************************************************

Version: 2.0.0
-------------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>
Copyright: (c) Z-Wave.Me, 2014

******************************************************************************/

function ZWave (id, controller) {

	// if called without "new", return list of loaded Z-Way instances
	if (!(this instanceof ZWave))
		return ZWave.list();

	ZWave.super_.call(this, id, controller);

	this.ZWAY_DEVICE_CHANGE_TYPES = {
		"DeviceAdded": 0x01,
		"DeviceRemoved": 0x02,
		"InstanceAdded": 0x04,
		"InstanceRemoved": 0x08,
		"CommandAdded": 0x10,
		"CommandRemoved": 0x20,
		"ZDDXSaved": 0x100,
		"EnumerateExisting": 0x200
	};

	this.ZWAY_DATA_CHANGE_TYPE = {
		"Updated": 0x01,       // Value updated or child created
		"Invalidated": 0x02,   // Value invalidated
		"Deleted": 0x03,       // Data holder deleted - callback is called last time before being deleted
		"ChildCreated": 0x04,  // New direct child node created

		// ORed flags
		"PhantomUpdate": 0x40, // Data holder updated with same value (only updateTime changed)
		"ChildEvent": 0x80     // Event from child node
	};

	this.CC = {
		"Basic": 0x20,
		"SwitchBinary": 0x25,
		"SwitchMultilevel": 0x26,
		"SwitchColor": 0x33,
		"SceneActivation": 0x2b,
		"Alarm": 0x71,
		"AlarmSensor": 0x9c,
		"SensorBinary": 0x30,
		"SensorMultilevel": 0x31,
		"Meter": 0x32,
		"ThermostatMode": 0x40,
		"ThermostatSetPoint": 0x43,
		"ThermostatFanMode": 0x44,
		"DoorLock": 0x62,
		"Battery": 0x80
	};
}

// Module inheritance and setup

inherits(ZWave, AutomationModule);

_module = ZWave;

Object.defineProperty(ZWave, "list", {
	value: function () {
		return Object.keys(ZWave);
	},
	enumerable: false,
	writable: false,  
	configurable: false 
});
ws.allowExternalAccess("ZWave.list", controller.auth.ROLE.ADMIN);

ZWave.prototype.init = function (config) {
	ZWave.super_.prototype.init.call(this, config);

	var self = this;

	this.postfix = this.loadModuleJSON("postfix.json");
	
	this.startBinding();
	if (!this.zway) {
		return;
	}

	this._dataBind = function(dataBindings, zwayName, nodeId, instanceId, commandClassId, path, func, type) {
		if (zwayName === self.config.name && self.zway) {
			self.dataBind(dataBindings, self.zway, nodeId, instanceId, commandClassId, path, func, type);
		}
	};
	this._dataUnbind = function(dataBindings) {
		self.dataUnbind(dataBindings);
	};
		
	this.controller.on("ZWave.dataBind", this._dataBind);
	this.controller.on("ZWave.dataUnbind", this._dataUnbind);

	this.controller.emit("ZWave.register", this.config.name);
};

ZWave.prototype.startBinding = function () {
	var self = this,
		moduleName = "ZWave",
		langFile = self.controller.loadModuleLang(moduleName);

	try {
		this.zway = new ZWaveBinding(this.config.name, this.config.port, {
			configFolder: this.config.config || 'config',
			translationsFolder: this.config.translations || 'translations',
			zddxFolder: this.config.ZDDX || 'ZDDX',
			terminationCallback: function() {
				self.terminating.call(self);
			}
		});
		
		try {
			this.zway.discover();
		} catch (e1) {
			this.zway.stop();
			throw e1;
		}
	} catch(e) {
		this.controller.addNotification("critical", langFile.err_binding_start + e.toString(), "z-wave", moduleName);
		this.zway = null;
		return;
	}

	this.fastAccess = false;
	if (!global.zway) {
		// this is the first zway - make fast shortcut
		this.fastAccess = true;
	}

	global.ZWave[this.config.name] = {
		"zway": this.zway,
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
		global["zway"] = this.zway; // global variable
		global["ZWaveAPI"] = this.ZWaveAPI;
	}
	if (this.config.enableAPI !== false) {
		this.externalAPIAllow(this.config.name);
	}
	_.extend(global["ZWave"][this.config.name], this.ZWaveAPI);

	if (this.config.createVDev !== false) {
		this.deadDetectionStart();
		this.gateDevicesStart();
	}
};

ZWave.prototype.stop = function () {
	console.log("--- ZWave.stop()");
	ZWave.super_.prototype.stop.call(this);

	this.stopBinding();

	if (this._dataBind) {
		this.controller.off("ZWave.dataBind", this._dataBind);
	}
	if (this._dataUnbind) {
		this.controller.off("ZWave.dataUnbind", this._dataUnbind);
	}
};

ZWave.prototype.stopBinding = function () {
	this.controller.emit("ZWave.unregister", this.config.name);
	
	if (this.config.createVDev !== false) {
		this.gateDevicesStop();
		this.deadDetectionStop();
	}

	if (this.fastAccess) {
		if (this.config.enableAPI !== false) {
			this.externalAPIRevoke();
		}
		if (global.zway) {
			delete global["zway"];
			delete global["ZWaveAPI"];
		}
	}
	
	if (this.config.enableAPI !== false) {
		this.externalAPIRevoke(this.config.name);
	}
	if (global.ZWave) {
		delete global.ZWave[this.config.name];
	}

	this.stopped = true;
	if (this.zway) {
		try {
			this.zway.stop();
		} catch(e) {
			// Z-Way has already gone
		}
		this.zway = null;
	}
};

ZWave.prototype.terminating = function () {
	if (!this.stopped) {
		console.log("Terminating Z-Wave binding");
		this.stopBinding();

		var self = this;
		setTimeout(function() {
			// retry open after 5 seconds
			console.log("Restarting Z-Wave binding");
			self.startBinding();
		}, 5000);
	}
};


// --------------- Public HTTP API -------------------


ZWave.prototype.externalAPIAllow = function (name) {
	var _name = !!name ? ("ZWave." + name) : "ZWaveAPI";

	ws.allowExternalAccess(_name, this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
	ws.allowExternalAccess(_name + ".Run", this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
	ws.allowExternalAccess(_name + ".Data", this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
	ws.allowExternalAccess(_name + ".InspectQueue", this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
	ws.allowExternalAccess(_name + ".Backup", this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
	ws.allowExternalAccess(_name + ".Restore", this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
	ws.allowExternalAccess(_name + ".CreateZDDX", this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
	ws.allowExternalAccess(_name + ".CommunicationStatistics", this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
	ws.allowExternalAccess(_name + ".FirmwareUpdate", this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
	ws.allowExternalAccess(_name + ".ZMELicense", this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
	ws.allowExternalAccess(_name + ".ZMEFirmwareUpgrade", this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
	ws.allowExternalAccess(_name + ".ZMEBootloaderUpgrade", this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
	// -- see below -- // ws.allowExternalAccess(_name + ".JSONtoXML", this.config.publicAPI ? this.controller.auth.ROLE.ADMIN : this.controller.auth.ROLE.ANONYMOUS);
};

ZWave.prototype.externalAPIRevoke = function (name) {
	var _name = !!name ? ("ZWave." + name) : "ZWaveAPI";

	ws.revokeExternalAccess(_name);
	ws.revokeExternalAccess(_name + ".Run");
	ws.revokeExternalAccess(_name + ".Data");
	ws.revokeExternalAccess(_name + ".InspectQueue");
	ws.revokeExternalAccess(_name + ".Backup");
	ws.revokeExternalAccess(_name + ".Restore");
	ws.revokeExternalAccess(_name + ".CreateZDDX");
	ws.revokeExternalAccess(_name + ".CommunicationStatistics");
	ws.revokeExternalAccess(_name + ".FirmwareUpdate");
	ws.revokeExternalAccess(_name + ".ZMELicense");
	ws.revokeExternalAccess(_name + ".ZMEFirmwareUpgrade");
	ws.revokeExternalAccess(_name + ".ZMEBootloaderUpgrade");
	// -- see below -- // ws.revokeExternalAccess(_name + ".JSONtoXML");
};

ZWave.prototype.defineHandlers = function () {
	var zway = this.zway;

	this.ZWaveAPI = function() {
		return { status: 400, body: "Bad ZWaveAPI request " };
	};

	this.ZWaveAPI.Run = function(url) {
		url = "with(zway) { " + url.substring(1) + " }";
		try {
			var r = eval(url);
			return {
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Connection": "keep-alive"
				},
				body: r
			};
		} catch (e) {
			return { status: 500, body: e.toString() };
		}
	};

	this.ZWaveAPI.Data = function(url) {
		var timestamp = parseInt(url.substring(1), 10) || 0;
		return {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Connection": "keep-alive"
			},
			body: zway.data(timestamp)
		};
	};

	this.ZWaveAPI.InspectQueue = function(url) {
		return {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Connection": "keep-alive"
			},
			body: zway.InspectQueue()
		};
	};

	this.ZWaveAPI.Backup = function(url) {
		var now = new Date();

		// create a timestamp in format yyyy-MM-dd-HH-mm
		var ts = now.getFullYear() + "-";
		ts += ("0" + (now.getMonth()+1)).slice(-2) + "-";
		ts += ("0" + now.getDate()).slice(-2) + "-";
		ts += ("0" + now.getHours()).slice(-2) + "-";
		ts += ("0" + now.getMinutes()).slice(-2);

		try {
			var data = zway.controller.Backup();
			return {
				status: 200,
				headers: {
					"Content-Type": "application/x-download",
					"Content-Disposition": "attachment; filename=z-way-backup-" + ts + ".zbk",
					"Connection": "keep-alive"
				},
				body: data
			};
		} catch (e) {
			return { status: 500, body: e.toString() };
		}
	};

	this.ZWaveAPI.Restore = function(url, request) {
		if (request.method === "POST" && request.data && request.data && request.data.config_backup) {
			var full = false;
			if (request.query && request.query.hasOwnProperty("restore_chip_info")) {
				var rci = request.query["restore_chip_info"];
				full = (rci === "yes" || rci === "true" || rci === "1");
			}

			var file = request.data.config_backup;
			if (file instanceof Array) {
				file = file[0];
			}
			if (file.name && file.content && file.length > 0) {
				// valid file object detected
				try {
					zway.controller.Restore(file.content, full);
					return {
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Connection": "keep-alive"
						},
						body: null
					};
				} catch (e) {
					return { status: 500, body: e.toString() };
				}
			}
		}
		return { status: 400, body: "Invalid request" };
	};

	this.ZWaveAPI.CreateZDDX = function(url, request) {
		function hexByteToStr(n) {
			return ("00" + parseInt(n, 10).toString(16)).slice(-2);
		}

		function hexWordToStr(n) {
			return ("0000" + parseInt(n, 10).toString(16)).slice(-4);
		}

		function tagAttrValue(name, value) {
			return	{
				"name": name,
				"attributes": {
					"value": value
				}
			};
		}

		function tagByte(name, value) {
			return tagAttrValue(name, hexByteToStr(value));
		}

		function tagWord(name, value) {
			return tagAttrValue(name, hexWordToStr(value));
		}

		function tagBool(name, value) {
			return tagAttrValue(name, value ? "true": "false");
		}

		function tagText(name, value) {
			return	{
				"name": name,
				"text": value
			};
		}

		function tagLangs(name, values) {
			var
				lang,
				langChildren = [];

			for (lang in values) {
				langChildren.push({
					"name": "lang",
					"attributes": {
						"xml:lang": lang
					},
					"text": values[lang]
				});
			}

			return {
				"name": name,
				"children": langChildren
			};
		}

		function inNIF(id, nif, afterMark) {
			var
				i,
				markFound = false;

			id = parseInt(id, 10);
			for (i in nif) {
				if (nif[i] === 0xEF) {
					markFound = true;
				}

				if (!(afterMark ^ markFound) && parseInt(nif[i], 10) === id) {
					return true;
				}
			}
			return false;
		}

		function tagCC(id, version, supported, secure, nif) {
			return {
				"name": "commandClass",
				"attributes": {
					"id": hexWordToStr(id),
					"version": version,
					"supported": supported || inNIF(id, nif, false),
					"controlled": !supported || inNIF(id, nif, true),
					"secure": secure,
					"inNIF": (supported && inNIF(id, nif, false)) || (!supported && inNIF(id, nif, true))
				}
			};
		}

		var	nodeId = url.split("/")[1],
			d = zway.devices[nodeId],
			zddx = new ZXmlDocument();

		zddx.root = {
			"name": "ZWaveDevice",
			"attributes": {
				"xmlns": "http://www.pepper1.net/zwavedb/xml-schemata/z-wave",
				"schemaVersion": "2"
			},
			"children": [
				{
					"name": "descriptorVersion",
					"text": "1"
				},
				{
					"name": "deviceData",
					"children": [
						tagWord("manufacturerId", d.data.manufacturerId.value),
						tagWord("productType", d.data.manufacturerProductType.value),
						tagWord("productId", d.data.manufacturerProductId.value),
						tagByte("libType", d.data.ZWLib.value),
						tagByte("protoVersion", d.data.ZWProtocolMajor.value),
						tagByte("protoSubVersion", d.data.ZWProtocolMinor.value),
						tagByte("appVersion", d.data.applicationMajor.value),
						tagByte("appSubVersion", d.data.applicationMinor.value),
						tagByte("basicClass", d.data.basicType.value),
						tagByte("genericClass", d.data.genericType.value),
						tagByte("specificClass", d.data.specificType.value),
						tagBool("optional", d.data.optional.value),
						tagBool("listening", d.data.isListening.value),
						tagBool("routing", d.data.isRouting.value),
						tagText("beamSensor", d.data.sensor250.value ? "250" : (d.data.sensor1000.value ? "1000" : "0"))
					]
				},
				{
					"name": "deviceDescription",
					"children": [
						tagLangs("description", {"en": ""}),
						tagLangs("wakeupNote", {"en": ""}),
						tagLangs("inclusionNote", {"en": ""}),
						tagText("productName", ""),
						tagText("brandName", ""),
						tagText("productVersion", d.data.applicationMajor.value.toString()  + "." + d.data.applicationMinor.value.toString())
					]
				},
				{
					"name": "commandClasses",
					"children": (function() {
						var
							ccId, n,
							arr = [],
							ccs = d.instances[0].commandClasses;

						for(ccId in ccs) {
							arr.push(tagCC(ccId, ccs[ccId].data.version.value, ccs[ccId].data.supported.value, ccs[ccId].data.security.value, d.data.nodeInfoFrame.value));
						}
						for(n in d.data.nodeInfoFrame.value) {
							ccId = d.data.nodeInfoFrame.value[n];
							if (!ccs[ccId] && ccId !== 0xEF) {
								arr.push(tagCC(ccId, 1, false, false, d.data.nodeInfoFrame.value));
							}
						}

						return arr;
					})()
				}
			]
		};

		if (d.instances[0].Association) {
			console.logJS(zddx.root.children);
			zddx.root.insertChild({
				"name": "assocGroups",
				"children": (function(data) {
					var
						n,
						Assocs = [];

					for (n = 1; n <= data.groups.value; n++) {
						Assocs.push({
							"name": "assocGroup",
							"attributes": {
								"number": n,
								"maxNodes": data[n].max.value
							},
							"children": [
								tagLangs("description", {"en": "Group " + n.toString()})
							]
						});
					}

					return Assocs;
				})(d.instances[0].Association.data)
			});
			console.logJS(zddx.root.children);
		}

		return {
			"status": 200,
			"body": zddx.toString(),
			"headers": {
				"Content-Type": "application/xml"
			}
		};
	};

	this.CommunicationStatistics = function (zw) {
		this.MAX_ARRAY_LENGTH = 30;

		this.zw = zw;
		this.zway = null;
		this.zwayBinding = null;
		this.devicesBindings = {};
		this.communicationStatistics = {};

		this.init(zw);
	}

	this.CommunicationStatistics.prototype.init = function(zw) {
		var self = this;

		if (!zw.zway || this.zwayBinding) {
			return;
		}

		this.zway = zw.zway;
		this.zwayBinding = this.zway.bind(function(type, nodeId) {
			if (type === zw.ZWAY_DEVICE_CHANGE_TYPES["DeviceAdded"]) {
				self.attach(nodeId);
			}
		}, zw.ZWAY_DEVICE_CHANGE_TYPES["DeviceAdded"] | zw.ZWAY_DEVICE_CHANGE_TYPES["EnumerateExisting"]);
	};

	this.CommunicationStatistics.prototype.attach = function(nodeId) {
		if (!this.zway || !this.zwayBinding || !this.zway.devices[nodeId] || this.devicesBindings[nodeId]) {
			return;
		}

		this.communicationStatistics[nodeId] = [];
		this.devicesBindings[nodeId] = this.zway.devices[nodeId].data.lastPacketInfo.bind(this.handler, {self: this, nodeId: nodeId}, false);
	};

	this.CommunicationStatistics.prototype.handler = function(type, args, self) {
		if (type === args.self.zw.ZWAY_DATA_CHANGE_TYPE["Deleted"]) return;
		args.self.communicationStatistics[args.nodeId].push({
			"date": (new Date()).getTime(),
			"delivered": this.delivered.value,
			"packetLength": this.packetLength.value,
			"deliveryTime": this.deliveryTime.value
		});
		args.self.communicationStatistics[args.nodeId].splice(0, Math.max(args.self.communicationStatistics[args.nodeId].length - args.self.MAX_ARRAY_LENGTH, 0));
	};

	this.CommunicationStatistics.prototype.stop = function() {
		var self = this;

		if (!this.zway || !this.zwayBinding) {
			return;
		}

		this.zway.unbind(this.zwayBinding);
		this.zwayBinding = null;

		Object.keys(this.devicesBindings).forEach(function(nodeId) {
			self.this.zway.devices[nodeId].data.lastPacketInfo.unbind(self.devicesBindings[nodeId]);
		});
		this.devicesBindings = {};

		this.communicationStatistics = {};

		this.zway = null;
	};

	this.CommunicationStatistics.prototype.get = function() {
		return this.communicationStatistics;
	};

	this.ZWaveAPI.CommunicationStatistics = (function(that) {
		var cs = new that.CommunicationStatistics(that);
		return function() {
			return cs.get();
		};
	})(this);

	this.ZWaveAPI.FirmwareUpdate = function(url, request) {
		try {
			var deviceId = parseInt(url.substring(1), 10);
			if (!deviceId) {
				throw "Invalid device id";
			}

			var fwUpdate = zway.devices[deviceId].FirmwareUpdate;
			if (!fwUpdate) {
				throw "Device doesn't support FW Update";
			}

			var data = request && request.data;
			if (!data) {
				throw "Invalid request";
			}

			var manufacturerId = fwUpdate.data.manufacturerId.value;
			var firmwareId = fwUpdate.data.firmwareId.value;

			if (!manufacturerId || !firmwareId) {
				throw "Either manufacturer or firmware id is not present";
			}

			if (!fwUpdate.data.upgradeable.value) {
				throw "Firmware is not upgradeable";
			}

			var targetId = parseInt(data.targetId);

			if (data.file && data.file.content) {
				// update firmware from file
				fwUpdate.Perform(manufacturerId, firmwareId, targetId, data.file.content);
			} else if (data.url) {
				// update firmware from url
				http.request({
					method: "GET",
					url: data.url,
					contentType: "application/octet-stream", // enforce binary response
					async: true,
					success: function (res) {
						fwUpdate.Perform(manufacturerId, firmwareId, targetId, res.data);
					},
					error: function (res) {
						console.error("Failed to download firmware: " + res.statusText);
					}
				});
			}
			return { status: 200, body: "Initiating update" };
		} catch (e) {
			return { status: 500, body: e.toString() };
		}
	};

	this.ZWaveAPI.ZMELicense = function(url, request) {
		try {
			var data = request && request.data;
			if (!data || !data.license) {
				throw "Invalid request";
			}

			var result = "in progress";
			zway.ZMECapabilities(data.license.split(",").map(function(i) { return parseInt(i, 10); }), function() {
				result = "done";
			},  function() {
				result = "failed";
			});
			
			var d = (new Date()).valueOf() + 20000; // wait not more than 20 seconds
			
			while ((new Date()).valueOf() < d &&  result === "in progress") {
				processPendingCallbacks();
			}
			
			if (result === "in progress") {
				result = "failed";
			}
			return (result === "done") ? { status: 200, body: "Done" } : { status: 500, body: "Failed" };
		} catch (e) {
			return { status: 500, body: e.toString() };
		}
	};

	this.ZWaveAPI.ZMEFirmwareUpgrade = function(url, request) {
		try {
			var data = request && request.data;
			if (!data || !data.url) {
				throw "Invalid request";
			}

			var result = "in progress";

			http.request({
				url: data.url,
				async: true,
				contentType: "application/octet-stream",
				success: function(response) {
					var L = 32,
					    addr = 0x7800, // M25PE10
					    data = response.data.slice(0x1800);
					
					for (var i = 0; i < data.byteLength; i += L) {
						var arr = (new Uint8Array(data.slice(i, i+L)));
						if (arr.length == 1) {
							arr = [arr[0]]
							arr.push(0xff); // we only need one byte, but a due to some error single byte is not read
						}
						zway.NVMExtWriteLongBuffer(addr + i, arr);
					}
					
					zway.NVMExtWriteLongBuffer(addr - 2, [0, 1],  // we only need one byte, but a due to some error single byte is not read
						function() {
							zway.SerialAPISoftReset(function() {
								result = "done"
							});
					});
				},
				error: function (res) {
					console.error("Failed to download firmware: " + res.statusText);
					result = "failed";
				}
			});
			
			var d = (new Date()).valueOf() + 300*1000; // wait not more than 5 minutes
			
			while ((new Date()).valueOf() < d &&  result === "in progress") {
				processPendingCallbacks();
			}
			
			if (result === "in progress") {
				result = "failed";
			}
			
			return (result === "done") ? { status: 200, body: "Done" } : { status: 500, body: "Failed" };
		} catch (e) {
			return { status: 500, body: e.toString() };
		}
	};

	this.ZWaveAPI.ZMEBootloaderUpgrade = function(url, request) {
		try {
			var data = request && request.data;
			if (!data || !data.url) {
				throw "Invalid request";
			}

			var result = "in progress";

			http.request({
				url: data.url,
				async: true,
				contentType: "application/octet-stream",
				success: function(response) {
					var L = 32,
					    seg = 6,	 // Функция бутлодера принимает номер сегмента
					    addr = seg*0x800, // ==12k
					    data = response.data;
					
					for (var i = 0; i < data.byteLength; i += L) {
						var arr = (new Uint8Array(data.slice(i, i+L)));
						if (arr.length == 1) {
							arr = [arr[0]]
							arr.push(0xff); // we only need one byte, but a due to some error single byte is not read
						}
						zway.NVMExtWriteLongBuffer(addr + i, arr);
					}
					
					zway.NVMExtWriteLongBuffer(addr - 2, [0, 0],  // we only need one byte, but a due to some error single byte is not read
						function() {
							//Вызываем перезапись bootloder
							zway.ZMEBootloaderFlash(seg, function() {
								result = "done";
							},  function() {
								result = "failed";
							});
					});
				},
				error: function (res) {
					console.error("Failed to download bootloader: " + res.statusText);
					result = "failed";
				}
			});
    
			var d = (new Date()).valueOf() + 60*1000; // wait not more than 60 seconds
			
			while ((new Date()).valueOf() < d &&  result === "in progress") {
				processPendingCallbacks();
			}
			
			if (result === "in progress") {
				result = "failed";
			}
			return (result === "done") ? { status: 200, body: "Done" } : { status: 500, body: "Failed" };
		} catch (e) {
			return { status: 500, body: e.toString() };
		}
	};

	/*
	// -- not used -- //
	this.ZWaveAPI.JSONtoXML = function(url, request) {
		function hexByteToStr(n) {
			return ("00" + parseInt(n).toString(16)).slice(-2);
		}

		function hexWordToStr(n) {
			return ("0000" + parseInt(n).toString(16)).slice(-4);
		}

		function nic(name, id) {
			return {
				"name": name,
				"attributes": {
					"id": id,
				},
				"children": []
			};
		}

		function tagDH(name, invalidateTime, updateTime, type, value) {
			switch (type) {
				case "int[]":
				case "float[]":
				case "binary":
					value = "[" + value.toString() + "]";
					break;
				case "string[]":
					value = "[" + value.map(function(el) { return "&quot;" + el + "&quot;"; }).toString() + "]"
					break;
			}

			return {
				"name": "data",
				"attributes": {
					"name": name,
					"invalidateTime": invalidateTime,
					"updateTime": updateTime,
					"type": type,
					"value": value
				},
				"children": []
			};
		}

		function treeDH(name, data) {
			var tag = tagDH(name, data.invalidateTime, data.updateTime, data.type, data.value);
			for (var key in data) {
				if (["value", "type", "invalidateTime", "updateTime"].indexOf(key) != -1)
					continue;
				tag.children.push(treeDH(key, data[key]));
			}
			return tag;
		}

		z = fs.loadJSON(url.split("/")[1]);
		var x = new ZXmlDocument();

		x.root = {
			"name": "devicesData",
			"children": []
		};

		x.root.insertChild({
			"name": "controller",
			"children": []
		});

		x.root.insertChild(treeDH("controller.data", z.controller.data));

		for (var nodeId in z.devices) {
			var device = nic("device", nodeId);
			device.children.push(treeDH("devices." + nodeId + ".data", z.devices[nodeId].data));
			for (var instanceId in z.devices[nodeId].instances) {
				var instance = nic("instance", instanceId);
				instance.children.push(treeDH("devices." + nodeId + ".insances." + instanceId + ".data", z.devices[nodeId].instances[instanceId].data));
				for (var ccId in z.devices[nodeId].instances[instanceId].commandClasses) {
					var cc = nic("commandClass", hexWordToStr(ccId));
					cc.children.push(treeDH("devices." + nodeId + ".insances." + instanceId + ".commandClasses." + ccId + ".data", z.devices[nodeId].instances[instanceId].commandClasses[ccId].data));
					instance.children.push(cc);
				}
				device.children.push(instance);
			}
			x.root.insertChild(device);
		}

		return {
			"status": 200,
			"body": x.toString(),
			"headers": {
				"Content-Type": "application/xml"
			}
		};
	};
	*/
};


// ------------- Data Binding --------------

ZWave.prototype._dataBind = function(dataBindings, zwayName, nodeId, instanceId, commandClassId, path, func, type) {
		if (zwayName === this.config.name) {
			this.dataBind(dataBindings, this.zway, nodeId, instanceId, commandClassId, path, func, type);
		}
	}
ZWave.prototype.dataBind = function(dataBindings, zway, nodeId, instanceId, commandClassId, path, func, type) {
	// two prototypes:
	//  (dataBindings, zway, nodeId, instanceId, commandClassId, path, func, type)
	//  (dataBindings, zway, nodeId,			     path, func)

	var pathArr = [],
		data = null,
		devBind = is_function(commandClassId);

	if (devBind) {
		path = instanceId;
		func = commandClassId;
		instanceId = undefined;
		commandClassId = undefined;
		data = zway.devices[nodeId].data;
	} else {
		data = zway.devices[nodeId].instances[instanceId].commandClasses[commandClassId].data;
	}

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
		if (devBind) {
			dataBindings.push({
				"zway": zway,
				"nodeId": nodeId,
				"path": path,
				"func": data.bind(func, nodeId, false)
			});
		} else {
			dataBindings.push({
				"zway": zway,
				"nodeId": nodeId,
				"instanceId": instanceId,
				"commandClassId": commandClassId,
				"path": path,
				"func": data.bind(func, null, type === "child")
			});
			if (type === "value") {
				func.call(data, this.ZWAY_DATA_CHANGE_TYPE.Updated);
			}
		}
	} else {
	 	console.log("Can not find data path:", nodeId, instanceId, commandClassId, path);
	}
};

ZWave.prototype.dataUnbind = function(dataBindings) {
	dataBindings.forEach(function (item) {
		var devBind = ! ("instanceId" in item);

		if (item.zway && item.zway.devices[item.nodeId] && (devBind || (item.zway.devices[item.nodeId].instances[item.instanceId] && item.zway.devices[item.nodeId].instances[item.instanceId].commandClasses[item.commandClassId]))) {
			var data = devBind ? item.zway.devices[item.nodeId].data : item.zway.devices[item.nodeId].instances[item.instanceId].commandClasses[item.commandClassId].data,
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
				console.log("Can not find data path:", item.nodeId, item.instanceId, item.commandClassId, item.path);
			}
		}
	});
	dataBindings = null;
};


// ------------- Dead Detection ------------


ZWave.prototype.deadDetectionStart = function () {
	var self = this;

	this.deadDetectionDataBindings = [];

	// Bind to all future CommandClasses changes
	this.deadDetectionBinding = this.zway.bind(function (type, nodeId) {
		if (type === self.ZWAY_DEVICE_CHANGE_TYPES["DeviceAdded"]) {
			self.deadDetectionAttach(nodeId);
		}
	}, this.ZWAY_DEVICE_CHANGE_TYPES["DeviceAdded"] | this.ZWAY_DEVICE_CHANGE_TYPES["EnumerateExisting"]);
};

ZWave.prototype.deadDetectionStop = function () {
	// releasing bindings
	try {
		if (this.deadDetectionDataBindings) {
			this.dataUnbind(this.deadDetectionDataBindings);
		}
		if (this.zway) {
			this.zway.unbind(this.zwayBinding);
		}
	} catch(e) {
		// Z-Way already gone, skip deallocation
		//this.zway = null;
	}
};

ZWave.prototype.deadDetectionAttach = function(nodeId) {
	var self = this;
	this.dataBind(this.deadDetectionDataBindings, this.zway, nodeId, "isFailed", function(type, arg) {
		if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) return;
		if (!(type & self.ZWAY_DATA_CHANGE_TYPE["PhantomUpdate"])) {
			self.deadDetectionCheckDevice(self, arg);
		}
	});
	this.dataBind(this.deadDetectionDataBindings, this.zway, nodeId, "failureCount", function(type, arg) {
		if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) return;
		if (!(type & self.ZWAY_DATA_CHANGE_TYPE["PhantomUpdate"])) {
			self.deadDetectionCheckDevice(self, arg);
		}
	});
};

ZWave.prototype.deadDetectionCheckDevice = function (self, nodeId) {
	var values = nodeId.toString(10),
	moduleName = "ZWave",
	langFile = this.controller.loadModuleLang(moduleName);

	if (self.zway.devices[nodeId].data.isFailed.value) {
		if (self.zway.devices[nodeId].data.failureCount.value === 2) {
			self.controller.addNotification("error", langFile.err_connct + values, "connection", moduleName);
		}
	} else {
		self.controller.addNotification("notification", langFile.dev_btl + values, "connection", moduleName);
	}
};


// ----------------- Devices Creator ---------------


ZWave.prototype.gateDevicesStart = function () {

	var self = this;

	this.gateDataBinding = [];

	// Bind to all future CommandClasses changes
	this.gateBinding = this.zway.bind(function (type, nodeId, instanceId, commandClassId) {
		if (type === self.ZWAY_DEVICE_CHANGE_TYPES["CommandAdded"]) {
			// Ignore Static PC Controllers
			if (2 === self.zway.devices[nodeId].data.basicType.value && 1 === self.zway.devices[nodeId].data.specificType.value) {
				// console.log("Device", nodeId, "is a Static PC Controller, ignoring");
				return;
			}

			self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "interviewDone", function(type) {
				if (this.value === true && type !== self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {

					var create = true,
						deviceData = zway.devices[nodeId].data,
						deviceInstances = zway.devices[nodeId].instances,
						c = zway.controller,
						mId = deviceData.manufacturerId.value? deviceData.manufacturerId.value : null,
						mPT = deviceData.manufacturerProductType.value? deviceData.manufacturerProductType.value : null,
						mPId = deviceData.manufacturerProductId.value? deviceData.manufacturerProductId.value: null,
						appMajor = deviceData.applicationMajor.value? deviceData.applicationMajor.value: null,
						appMinor = deviceData.applicationMinor.value? deviceData.applicationMinor.value: null,
						devId,postFix;					
					
					// try to get fix by manufacturerProductId and application Version
					if(!!mId && !!mPT && !!mPId && !!self.postfix) {

						devId = mId + '.' + mPT + '.' + mPId,
						appMajorId = devId + '.' + appMajor,
						appMinorId = devId + '.' + appMinor,
						postFix = self.postfix.filter(function(device){
							return 	device.id === devId || 		//search by manufacturerProductId
									device.id === appMajorId || //search by applicationMajor
									device.id === appMinorId; 	//search by applicationMinor
						});
					}

					if(postFix) {
						if(postFix.length > 0){
							try {
								// works of course only during inclusion - after restart hidden elements are visible again
								if(!!nodeId && c.data.lastIncludedDevice.value === nodeId){
									var intDone = deviceInstances[instanceId].commandClasses[commandClassId].data.interviewDone.value;
								    	intDelay = (new Date()).valueOf() + 5*1000; // wait not more than 5 seconds for single interview

									// wait till interview is done
									while ((new Date()).valueOf() < intDelay &&  intDone === false) {
										intDone = deviceInstances[instanceId].commandClasses[commandClassId].data.interviewDone.value;
									}
									
									if (intDone === false) {
										try {
											// call preInteview functions from postfix.json
											postFix.forEach(function(fix){
												if(!!fix.preInterview && fix.preInterview && fix.preInterview.length > 0){
													fix.preInterview.forEach(function(func){
														eval(func);
													});
												}
											});
										}catch(e){
											console.log("##---INTERVIEW-HAS-FAILED-----PREFIX-HAS-FAILED---##", e);
										}
									}
								}
																
								// call postInterview functions from postfix.json
								postFix.forEach(function(fix){
									if(!!fix.postInterview && fix.postInterview && fix.postInterview.length > 0){
										fix.postInterview.forEach(function(func){
											eval(func);
										});
									}
								});
							}catch(e){
								console.log("#### --- PRE-OR-POSTFIX-ERROR:", e);
							}
						}
					}

					if(create){
						self.parseAddCommandClass(nodeId, instanceId, commandClassId, false);
					}
				} else {
					self.parseDelCommandClass(nodeId, instanceId, commandClassId, false);
				}
			}, "value");
		} else {
			self.parseDelCommandClass(nodeId, instanceId, commandClassId);
		}
	}, this.ZWAY_DEVICE_CHANGE_TYPES["CommandAdded"] | this.ZWAY_DEVICE_CHANGE_TYPES["CommandRemoved"] | this.ZWAY_DEVICE_CHANGE_TYPES["EnumerateExisting"]);
};

ZWave.prototype.gateDevicesStop = function () {
	var self = this;
	
	// delete devices
	this.controller.devices.map(function (el) {
		return el.id;
	}).filter(function(el) {
		return el.indexOf("ZWayVDev_" + self.config.name + "_") === 0;
	}).forEach(function(el) {
		self.controller.devices.remove(el);
	});
	
	// releasing bindings
	try {
		if (this.gateDataBinding) {
			this.dataUnbind(this.gateDataBinding);
		}
		if (this.zway) {
			this.zway.unbind(this.gateBinding);
		}
	} catch(e) {
		// Z-Way already gone, skip deallocation
		//this.zway = null;
	}
};

ZWave.prototype.parseAddCommandClass = function (nodeId, instanceId, commandClassId, scaleAdded) {
	nodeId = parseInt(nodeId, 10);
	instanceId = parseInt(instanceId, 10);
	commandClassId = parseInt(commandClassId, 10);

	var self = this,
		instance = this.zway.devices[nodeId].instances[instanceId],
		instanceCommandClasses = Object.keys(instance.commandClasses).map(function(x) { return parseInt(x); }),
		cc = instance.commandClasses[commandClassId],
		separ = "-",
		vDevIdPrefix = "ZWayVDev_" + this.config.name + "_",
		vDevIdNI = nodeId + separ + instanceId,
		vDevIdC = commandClassId,
		vDevId = vDevIdPrefix + vDevIdNI + separ + vDevIdC,
		defaults;
		// vDev is not in this scope, but in {} scope for each type of device to allow reuse it without closures

	try {
		if (!cc.data.supported.value) {
			return; // do not handle unsupported Command Classes
		}

		// Ignore SwitchBinary if SwitchMultilevel exists
		if (this.CC["SwitchBinary"] === commandClassId && in_array(instanceCommandClasses, this.CC["SwitchMultilevel"]) && instance.commandClasses[this.CC["SwitchMultilevel"]].data.supported.value) {
			// console.log("Ignoring SwitchBinary due to SwitchMultilevel existence");
			return;
		}
		if (this.CC["SwitchMultilevel"] === commandClassId && this.controller.devices.get(vDevIdPrefix + vDevIdNI + separ + this.CC["SwitchBinary"])) {
			// console.log("Removing SwitchBinary due to SwitchMultilevel existence");
			this.controller.devices.remove(vDevIdPrefix + vDevIdNI + separ + this.CC["SwitchBinary"]);
		}

		var vendorName = "";
		if (this.zway.devices[nodeId].data.vendorString.value) {
			vendorName = this.zway.devices[nodeId].data.vendorString.value;
		}

		function compileTitle() {
			var args = new Array();
			for (var i = 0; i < arguments.length; i++) {
				args.push(arguments[i]);
			}
			if (vendorName) {
				args.push(vendorName);
			}
			return args.join(' ');
		}

		if (this.CC["SwitchBinary"] === commandClassId && !self.controller.devices.get(vDevId)) {
			defaults = {
				deviceType: "switchBinary",
				metrics: {
					icon: 'switch',
					title: compileTitle('Switch', vDevIdNI)
				}
			};

			var vDev = self.controller.devices.create({
				deviceId: vDevId,
				defaults: defaults,
				overlay: {},
				handler: function (command) {
					if ("on" === command) {
						cc.Set(true);
					} else if ("off" === command) {
						cc.Set(false);
					} else if ("update" === command) {
						cc.Get(vDevId);
					}
				},
				moduleId: self.id
			});

			if (vDev) {
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "level", function () {
					try {
						vDev.set("metrics:level", this.value ? "on" : "off");
					} catch (e) {}
				}, "value");
			}
		} else if (this.CC["SwitchMultilevel"] === commandClassId && !self.controller.devices.get(vDevId)) {
			var isBlind = this.zway.devices[nodeId].data.genericType.value === 0x11 && _.contains([3, 5, 6, 7], this.zway.devices[nodeId].data.specificType.value);
			defaults = {
				deviceType: "switchMultilevel",
				metrics: {
					icon: isBlind ? 'blinds' : 'multilevel',
					title: compileTitle(isBlind ? 'Blind' : 'Dimmer', vDevIdNI)
				}
			};


			var vDev = self.controller.devices.create({
				deviceId: vDevId,
				defaults: defaults,
				overlay: {},
				handler: function(command, args) {
					var newVal;
					// up, down for Blinds
					if ("on" === command || "up" === command) {
						newVal = 255;
					} else if ("off" === command || "down" === command) {
						newVal = 0;
					} else if ("min" === command) {
						newVal = 10;
					} else if ("max" === command || "upMax" === command) {
						newVal = 99;
					} else if ("increase" === command) {
						newVal = this.metrics.level + 10;
						if (0 !== newVal % 10) {
							newVal = Math.round(newVal / 10) * 10;
						}
						if (newVal > 99) {
							newVal = 99;
						}

					} else if ("decrease" === command) {
						newVal = this.metrics.level - 10;
						if (newVal < 0) {
							newVal = 0;
						}
						if (0 !== newVal % 10) {
							newVal = Math.round(newVal / 10) * 10;
						}
					} else if ("exact" === command || "exactSmooth" === command) {
						newVal = parseInt(args.level, 10);
						if (newVal < 0) {
							newVal = 0;
						} else if (newVal === 255) {
							newVal = 255;
						} else if (newVal > 99) {
							if (newVal === 100) {
								newVal = 99;
							} else {
								newVal = null;
							}
						}
					} else if ("stop" === command) { // Commands for Blinds
						cc.StopLevelChange();
					} else if ("startUp" === command) {
						cc.StartLevelChange(0);
					} else if ("startDown" === command) {
						cc.StartLevelChange(1);
					} else if ("update" === command) {
						cc.Get(vDevId);
					}

					if (0 === newVal || !!newVal) {
						if ("exactSmooth" === command)
							cc.Set(newVal, args.duration);
						else
							cc.Set(newVal);
					}
				},
				moduleId: self.id
			});

			if (vDev) {
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "level", function(type, arg) {
				        if (!(type & self.ZWAY_DATA_CHANGE_TYPE["PhantomUpdate"]) && this.updateTime > this.invalidateTime) {
				                setTimeout(function () {
				                        self.zway.devices[nodeId].instances[instanceId].commandClasses[commandClassId].Get();
                                                }, 1000);
				        }
					try {
						vDev.set("metrics:level", this.value);
					} catch (e) {}
				}, "value");
			}
		} else if (this.CC["SwitchColor"] === commandClassId && !self.controller.devices.get(vDevId)) {
			var
				COLOR_SOFT_WHITE = 0,
				COLOR_COLD_WHITE = 1,
				COLOR_RED = 2,
				COLOR_GREEN = 3,
				COLOR_BLUE = 4;

			var haveRGB = cc.data && cc.data[COLOR_RED] && cc.data[COLOR_GREEN] && cc.data[COLOR_BLUE] && true;
			
			if (haveRGB && !self.controller.devices.get(vDevId + separ + "rgb")) {
				var vDev_rgb = this.controller.devices.create({
					deviceId: vDevId + separ + "rgb",
					defaults: {
						deviceType: "switchRGBW",
						metrics: {
							icon: 'multilevel',
							title: compileTitle('Color', vDevIdNI + separ + vDevIdC),
							color: {r: cc.data[COLOR_RED].level.value, g: cc.data[COLOR_GREEN].level.value, b: cc.data[COLOR_BLUE].level.value},
							level: 'off'
						}
					},
					overlay: {},
					handler:  function (command, args) {
						var color = {r: 0, g: 0, b: 0};
						if (command === "on") {
							color.r = color.g = color.b = 255;
						} else if (command === "off") {
							color.r = color.g = color.b = 0;
						} else if (command === "exact") {
							color.r = parseInt(args.red, 10);
							color.g = parseInt(args.green, 10);
							color.b = parseInt(args.blue, 10);
						}
						cc.SetMultiple([COLOR_RED, COLOR_GREEN, COLOR_BLUE], [color.r, color.g, color.b]);
					},
					moduleId: this.id
				});

				function handleColor(type, arg) {
					if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
						self.controller.devices.remove(vDevId + separ + 'rgb');
					} else {
						vDev_rgb.set("metrics:color", {r: cc.data[COLOR_RED].level.value, g: cc.data[COLOR_GREEN].level.value, b: cc.data[COLOR_BLUE].level.value});
					}
					
					vDev_rgb.set("metrics:level", (cc.data[COLOR_RED].level.value || cc.data[COLOR_GREEN].level.value || cc.data[COLOR_BLUE].level.value) ? "on" : "off");
				}
					
				if (vDev_rgb) {
					self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, COLOR_RED + ".level", handleColor, "value");
					self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, COLOR_GREEN + ".level", handleColor, "value");
					self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, COLOR_BLUE + ".level", handleColor, "value");
				}
			}

			Object.keys(cc.data).forEach(function (colorId) {
				colorId = parseInt(colorId, 10);
				if (!isNaN(colorId) && !self.controller.devices.get(vDevId + separ + colorId) && (!haveRGB || (colorId !== COLOR_RED && colorId !== COLOR_GREEN && colorId !== COLOR_BLUE))) {
					var vDev = self.controller.devices.create({
						deviceId: vDevId + separ + colorId,
						defaults: {
							deviceType: "switchMultilevel",
							metrics: {
								icon: 'multilevel',
								title: compileTitle(cc.data[colorId].capabilityString.value, vDevIdNI + separ + vDevIdC + separ + colorId),
								level: 'off'
							}
						},
						overlay: {},
						handler: function(command, args) {
							var newVal;
							// up, down for Blinds
							if ("on" === command || "up" === command) {
								newVal = 255;
							} else if ("off" === command || "down" === command) {
								newVal = 0;
							} else if ("min" === command) {
								newVal = 10;
							} else if ("max" === command || "upMax" === command) {
								newVal = 99;
							} else if ("increase" === command) {
								newVal = this.metrics.level + 10;
								if (0 !== newVal % 10) {
									newVal = Math.round(newVal / 10) * 10;
								}
								if (newVal > 99) {
									newVal = 99;
								}

							} else if ("decrease" === command) {
								newVal = this.metrics.level - 10;
								if (newVal < 0) {
									newVal = 0;
								}
								if (0 !== newVal % 10) {
									newVal = Math.round(newVal / 10) * 10;
								}
							} else if ("exact" === command || "exactSmooth" === command) {
								newVal = parseInt(args.level, 10);
								if (newVal < 0) {
									newVal = 0;
								} else if (newVal === 255) {
									newVal = 255;
								} else if (newVal > 99) {
									if (newVal === 100) {
										newVal = 99;
									} else {
										newVal = null;
									}
								}
							} else if ("stop" === command) { // Commands for Blinds
								cc.StopLevelChange(colorId);
							} else if ("startUp" === command) {
								cc.StartLevelChange(colorId, 0);
							} else if ("startDown" === command) {
								cc.StartLevelChange(colorId, 1);
							}

							if (0 === newVal || !!newVal) {
								if ("exactSmooth" === command)
									cc.Set(colorId, newVal, args.duration);
								else
									cc.Set(colorId, newVal);
							}
						},
						moduleId: self.id
					});

					if (vDev) {
						self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, colorId + ".level", function(type) {
							if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
								self.controller.devices.remove(vDevId + separ + colorId);
							} else {
								try {
									vDev.set("metrics:level", this.value);
								} catch (e) {}
							}
						}, "value");
					}
				}
			});
		} else if (this.CC["SensorBinary"] === commandClassId) {
			defaults = {
				deviceType: 'sensorBinary',
				metrics: {
					probeTitle: '',
					scaleTitle: '',
					icon: '',
					level: '',
					title: ''
				}
			};
			Object.keys(cc.data).forEach(function (sensorTypeId) {
				sensorTypeId = parseInt(sensorTypeId, 10);
				if (!isNaN(sensorTypeId) && !self.controller.devices.get(vDevId + separ + sensorTypeId)) {
					defaults.metrics.probeTitle = cc.data[sensorTypeId].sensorTypeString.value;
					defaults.metrics.title =  compileTitle('Sensor', defaults.metrics.probeTitle, vDevIdNI + separ + vDevIdC + separ + sensorTypeId);
					// aivs // Motion icon for Sensor Binary by default
					defaults.metrics.icon = "motion";

					if (sensorTypeId === 2) {
							defaults.metrics.icon = "smoke";
					} else if (sensorTypeId === 3 || sensorTypeId === 4) {
							defaults.metrics.icon = "co";
					} else if (sensorTypeId === 6) {
							defaults.metrics.icon = "flood";
					} else if (sensorTypeId === 7) {
							defaults.metrics.icon = "cooling";
					} else if (sensorTypeId === 10) {
							defaults.metrics.icon = "door";
					} else if (sensorTypeId === 12) {
							defaults.metrics.icon = "motion";
					}

					var vDev = self.controller.devices.create({
						deviceId: vDevId + separ + sensorTypeId,
						defaults: defaults,
						overlay: {},
						handler: function(command) {
							if (command === "update") {
								cc.Get(sensorTypeId);
							}
						},
						moduleId: self.id
					});

					if (vDev) {
						self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, sensorTypeId + ".level", function(type) {
							if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
								self.controller.devices.remove(vDevId + separ + sensorTypeId);
							} else {
								try {
									vDev.set("metrics:level", this.value ? "on" : "off");
								} catch (e) {};
							}
						}, "value");
					}
				}
			});
			if (!scaleAdded) {
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "", function(type) {
					if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
						self.parseAddCommandClass(nodeId, instanceId, commandClassId, true);
					}
				}, "child");
			}
		} else if (this.CC["SensorMultilevel"] === commandClassId) {
			defaults = {
				deviceType: "sensorMultilevel",
				metrics: {
					probeTitle: '',
					scaleTitle: '',
					level: '',
					icon: '',
					title: ''
				}
			};
			Object.keys(cc.data).forEach(function (sensorTypeId) {
				sensorTypeId = parseInt(sensorTypeId, 10);
				if (!isNaN(sensorTypeId) && !self.controller.devices.get(vDevId + separ + sensorTypeId)) {
					defaults.metrics.probeTitle = cc.data[sensorTypeId].sensorTypeString.value;
					defaults.metrics.scaleTitle = cc.data[sensorTypeId].scaleString.value;
					defaults.metrics.title =  compileTitle('Sensor', defaults.metrics.probeTitle, vDevIdNI + separ + vDevIdC + separ + sensorTypeId);
					if (sensorTypeId === 1) {
							defaults.metrics.icon = "temperature";
					} else if (sensorTypeId === 3) {
							defaults.metrics.icon = "luminosity";
					} else if (sensorTypeId === 4 || sensorTypeId === 15 || sensorTypeId === 16) {
							defaults.metrics.icon = "energy";
					} else if (sensorTypeId === 5) {
							defaults.metrics.icon = "humidity";
					}

					var vDev = self.controller.devices.create({
						deviceId: vDevId + separ + sensorTypeId,
						defaults: defaults,
						overlay: {},
						handler: function(command) {
							if (command === "update") {
								cc.Get(sensorTypeId);
							}
						},
						moduleId: self.id
					});

					if (vDev) {
						self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, sensorTypeId + ".val", function(type) {
							if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
								self.controller.devices.remove(vDevId + separ + sensorTypeId);
							} else {
								try {
									vDev.set("metrics:level", this.value);
								} catch (e) {}
							}
						}, "value");
					}
				}
			});
			if (!scaleAdded) {
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "", function(type) {
					if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
						self.parseAddCommandClass(nodeId, instanceId, commandClassId, true);
					}
				}, "child");
			}
		} else if (this.CC["Meter"] === commandClassId) {
			defaults = {
				deviceType: 'sensorMultilevel',
				metrics: {
					probeTitle: '',
					scaleTitle: '',
					level: '',
					icon: 'meter',
					title: ''
				}
			};
			Object.keys(cc.data).forEach(function (scaleId) {
				scaleId = parseInt(scaleId, 10);
				if (!isNaN(scaleId) && !self.controller.devices.get(vDevId + separ + scaleId)) {
					defaults.metrics.probeTitle = cc.data[scaleId].sensorTypeString.value;
					defaults.metrics.scaleTitle = cc.data[scaleId].scaleString.value;
					defaults.metrics.title = compileTitle('Meter', defaults.metrics.probeTitle, vDevIdNI + separ + vDevIdC + separ + scaleId);

					var vDev = self.controller.devices.create({
						deviceId: vDevId + separ + scaleId,
						defaults: defaults,
						overlay: {},
						handler: function(command) {
							if (command === "update") {
								cc.Get(scaleId);
							}
						},
						moduleId: self.id
					});

					if (vDev) {
						self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, scaleId + ".val", function(type) {
							if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
								self.controller.devices.remove(vDevId + separ + scaleId);
							} else {
								try {
									vDev.set("metrics:level", this.value);
								} catch (e) {}
							}
						}, "value");
					}
				}
			});
			if (!scaleAdded) {
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "", function(type) {
					if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
						self.parseAddCommandClass(nodeId, instanceId, commandClassId, true);
					}
				}, "child");
			}
		} else if (this.CC["Battery"] === commandClassId && !self.controller.devices.get(vDevId)) {
			defaults = {
				deviceType: 'battery',
				metrics: {
					probeTitle: 'Battery',
					scaleTitle: '%',
					level: '',
					icon: 'battery',
					title: compileTitle('Battery', vDevIdNI)
				}
			};

			var vDev = self.controller.devices.create({
				deviceId: vDevId,
				defaults: defaults,
				overlay: {},
				handler: function(command) {
					if (command === "update") {
						cc.Get();
					}
				},
				moduleId: self.id
			});

			if (vDev) {
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "last", function() {
					try {
						vDev.set("metrics:level", this.value === 255 ? 0 : this.value);
					} catch (e) {}
				}, "value");
			}
		} else if (this.CC["DoorLock"] === commandClassId && !self.controller.devices.get(vDevId)) {
			defaults = {
				deviceType: 'doorlock',
				metrics: {
					level: '',
					icon: 'door',
					title: compileTitle('Door Lock', vDevIdNI)
				}
			};

			var vDev = self.controller.devices.create({
				deviceId: vDevId,
				defaults: defaults,
				overlay: {},
				handler: function(command) {
					if ("open" === command) {
						cc.Set(0);
					} else if ("close" === command) {
						cc.Set(255);
					}
				},
				moduleId: self.id
			});
			if (vDev) {
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "mode", function() {
					try {
						vDev.set("metrics:level", this.value === 255 ? "close" : "open");
					} catch (e) {}
				}, "value");
			}
		} else if (this.CC["ThermostatMode"] === commandClassId || this.CC["ThermostatSetPoint"] === commandClassId) {
			var
				withMode = in_array(instanceCommandClasses, this.CC["ThermostatMode"]) && instance.ThermostatMode.data.supported.value,
				withTemp = in_array(instanceCommandClasses, this.CC["ThermostatSetPoint"]) && instance.ThermostatSetPoint.data.supported.value,
				deviceNamePrefix = "ZWayVDev_" + this.config.name + "_" + nodeId + separ + instanceId + separ;

			if ((withMode && !instance.ThermostatMode.data.interviewDone.value) || (withTemp && !instance.ThermostatSetPoint.data.interviewDone.value)) {
				return; // skip not finished interview
			}

			var MODE_OFF = 0, MODE_HEAT = 1, MODE_COOL = 2;

			if (withMode && !self.controller.devices.get(deviceNamePrefix + this.CC["ThermostatMode"])) {
				var withModeOff = !!instance.ThermostatMode.data[MODE_OFF],
					withModeHeat = !!instance.ThermostatMode.data[MODE_HEAT],
					withModeCool = !!instance.ThermostatMode.data[MODE_COOL];

				if (withModeOff && withModeHeat && withModeCool) {
					console.log("Device", nodeId, "supports Off, Heat and Cool - rendering only Off and Heat");
					withModeCool = false;
				}

				if (withModeOff && (withModeHeat || withModeCool)) {
					defaults = {
						deviceType: "switchBinary",
						metrics: {
							icon: 'thermostat',
							title: compileTitle("Thermostat " + (withModeHeat ? "heating" :"cooling"), vDevIdNI)
						}
					};

					var m_vDev = self.controller.devices.create({
						deviceId: deviceNamePrefix + this.CC["ThermostatMode"], // this name is referenced again in SetPoint device!
						defaults: defaults,
						overlay: {},
						handler: function (command) {
							if ("on" === command) {
								instance.ThermostatMode.Set(withModeHeat ? MODE_HEAT : MODE_COOL);
							} else if ("off" === command) {
								instance.ThermostatMode.Set(MODE_OFF);
							}
						},
						moduleId: self.id
					});

					if (m_vDev) {
						self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, this.CC["ThermostatMode"], "mode", function () {
							try {
								m_vDev.set("metrics:level", this.value != MODE_OFF ? "on" : "off");
							} catch (e) {}
						}, "value");
					}
				}
			}

			if (withTemp && !self.controller.devices.get(deviceNamePrefix + this.CC["ThermostatSetPoint"])) {
				var withTempHeat = instance.ThermostatSetPoint.data[MODE_HEAT],
					withTempCool = instance.ThermostatSetPoint.data[MODE_COOL];

				if (withTempHeat && withTempCool) {
					withTempCool = false;
				}

				if (withTempHeat || withTempCool) {
					var mode = withTempHeat ? MODE_HEAT : MODE_COOL,
						DH = instance.ThermostatSetPoint.data[mode];

					var t_vDev = this.controller.devices.create({
						deviceId: deviceNamePrefix + this.CC["ThermostatSetPoint"],
						defaults: {
							deviceType: "thermostat",
							metrics: {
								scaleTitle: instance.ThermostatSetPoint.data[mode].scaleString.value,
								level: DH.val.value,
								min: 5,
								max: 40,
								icon: 'thermostat',
								title: compileTitle("Thermostat", vDevIdNI)
							}
						},
						overlay: {},
						handler: function (command, args) {
							instance.ThermostatSetPoint.Set(mode, args.level);

							// and turn change the mode
							var _v = this.controller.devices.get(deviceNamePrefix + self.CC["ThermostatMode"]);
							if (_v && _v.get("metrics:level") === "off") {
								_v.performCommand("on");
							}
						},
						moduleId: self.id
					});

					if (t_vDev) {
						self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, self.CC["ThermostatSetPoint"], mode + ".setVal", function(type) {
							try {
								t_vDev.set("metrics:level", this.value);
							} catch (e) {}
						});
					}
				}
			}
		} else if (this.CC["AlarmSensor"] === commandClassId) {
			a_defaults = {
				deviceType: 'sensorBinary',
				metrics: {
					icon: 'alarm',
					level: 'off',
					title: ''
				}
			};
			/*d_defaults = {
				deviceType: 'toggleButton',
				metrics: {
					icon: 'alarm',
					level: 'off',
					title: ''
				}
			};*/
			Object.keys(cc.data).forEach(function (sensorTypeId) {
				sensorTypeId = parseInt(sensorTypeId, 10);

				var a_id = vDevId + separ + sensorTypeId + separ + "A";
				    //d_id = vDevId + separ + sensorTypeId + separ + "D";

				if (!isNaN(sensorTypeId) && !self.controller.devices.get(a_id)) { // && !self.controller.devices.get(d_id)
					a_defaults.metrics.title = compileTitle('Alarm', cc.data[sensorTypeId].typeString.value, vDevIdNI + separ + vDevIdC + separ + sensorTypeId);
					//d_defaults.metrics.title = compileTitle('Disarm', cc.data[sensorTypeId].typeString.value, vDevIdNI + separ + vDevIdC + separ + sensorTypeId);

					var a_vDev = self.controller.devices.create({
						deviceId: a_id,
						defaults: a_defaults,
						overlay: {},
						handler: function(command) {
							if (command === "update") {
								cc.Get(sensorTypeId);
							}
						},
						moduleId: self.id
					});

					/*
					var d_vDev = self.controller.devices.create({
						deviceId: d_id,
						defaults: d_defaults,
						overlay: {},
						handler: function(command) {
							if (command === "on") {
								var vDev = this.controller.devices.get(a_id);
								if (vDev) {
									try {
										vDev.set("metrics:level", "off");
									} catch (e) {}
								}
								this.set("metrics:level", "on"); // update on ourself to allow catch this event
							}
						},
						moduleId: self.id
					});
					*/
					if (a_vDev) {
						self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, sensorTypeId + ".sensorState", function(type) {
							if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
								self.controller.devices.remove(vDevId + separ + sensorTypeId + separ + "A");
								//self.controller.devices.remove(vDevId + separ + sensorTypeId + separ + "D");
							} else {
								try {
									a_vDev.set("metrics:level", this.value ? "on" : "off");
								} catch (e) {}
							}
						}, "value");
					}
				}
			});
			if (!scaleAdded) {
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "", function(type) {
					if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
						self.parseAddCommandClass(nodeId, instanceId, commandClassId, true);
					}
				}, "child");
			}
		} else if (this.CC["Alarm"] === commandClassId) {
			if (cc.data.version < 3) return; // We skip old Alarm CC implementations handling only v3 (Notification)
			
			a_defaults = {
				deviceType: 'sensorBinary',
				metrics: {
					icon: 'alarm',
					level: 'off',
					title: ''
				}
			};
			/*d_defaults = {
				deviceType: 'toggleButton',
				metrics: {
					icon: 'alarm',
					level: 'off',
					title: ''
				}
			};*/
			Object.keys(cc.data).forEach(function (notificationTypeId) {
				notificationTypeId = parseInt(notificationTypeId, 10);

				if (!isNaN(notificationTypeId)) {
				        var DOOR_OPEN = 0x16, DOOR_CLOSE = 0x17;
					if (notificationTypeId === 0x06 && (cc.data[notificationTypeId].eventMask.value & ((1 << DOOR_OPEN) | (1 << DOOR_CLOSE)))) { // Very special case of Door
                                                a_defaults.metrics.icon = 'door';
                                                
                                                var a_id = vDevId + separ + notificationTypeId + separ + 'Door' + separ + "A";

                                                if (!self.controller.devices.get(a_id)) {
                                                        a_defaults.metrics.title = compileTitle('Alarm', cc.data[notificationTypeId].typeString.value, vDevIdNI + separ + vDevIdC + separ + notificationTypeId + separ + 'Door');

                                                        var a_vDev = self.controller.devices.create({
                                                                deviceId: a_id,
                                                                defaults: a_defaults,
                                                                overlay: {},
                                                                handler: function(command) {
                                                                        if (command === "update") {
                                                                                cc.Get(0, notificationTypeId, DOOR_OPEN);
                                                                                cc.Get(0, notificationTypeId, DOOR_CLOSE);
                                                                        }
                                                                },
                                                                moduleId: self.id
                                                        });

                                                        if (a_vDev) {
                                                                self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, notificationTypeId.toString(10), function(type) {
                                                                        if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
                                                                                self.controller.devices.remove(vDevId + separ + notificationTypeId + separ + 'Door' + separ + "A");
                                                                        } else {
                                                                                if (this.event.value === DOOR_OPEN || this.event.value === DOOR_CLOSE) {
                                                                                        try {
                                                                                                a_vDev.set("metrics:level", (this.event.value == DOOR_OPEN) ? "on" : "off");
                                                                                        } catch (e) {}
                                                                                }
                                                                        }
                                                                }, "value");
                                                        }
                                                }
                                        }
                                        
					// we handle only few Notification Types
					switch (notificationTypeId) {
						case 0x01: // Smoke
							a_defaults.metrics.icon = 'smoke';
							break;
						case 0x02: // CO
							a_defaults.metrics.icon = 'co';
							break;
						case 0x03: // CO2
							a_defaults.metrics.icon = 'co';
							break;
						case 0x04: // Heat
							a_defaults.metrics.icon = 'alarm';
							break;
						case 0x05: // Water
							a_defaults.metrics.icon = 'flood';
							break;
						case 0x07: // Home Security (Burglar)
							a_defaults.metrics.icon = 'smoke';
							break;
						case 0x08: // Power
							a_defaults.metrics.icon = 'alarm';
							break;
						case 0x09: // System
							a_defaults.metrics.icon = 'alarm';
							break;
						case 0x0a: // Emergency
							a_defaults.metrics.icon = 'alarm';
							break;
						case 0x0b: // Clock
							a_defaults.metrics.icon = 'alarm';
							break;
						default:
							return; // skip this type
					}
					//d_defaults.metrics.icon = a_defaults.metrics.icon;
					
					maskToTypes = function(bitmask) {
						var types = [], n = 0;
						
						while (bitmask) {
							if (bitmask & 0x01) {
								types.push(n);
							}
							n++;
							bitmask >>= 1;
						}
						
						return types;
					};
					
					maskToTypes(cc.data[notificationTypeId].eventMask.value).forEach(function (eventTypeId) {
						eventTypeId = parseInt(eventTypeId, 10);

						var a_id = vDevId + separ + notificationTypeId + separ + eventTypeId + separ + "A";
						    //d_id = vDevId + separ + notificationTypeId + separ + eventTypeId + separ + "D";

						if (!isNaN(eventTypeId)  && !self.controller.devices.get(a_id)) { // && !self.controller.devices.get(d_id)
							a_defaults.metrics.title = compileTitle('Alarm', cc.data[notificationTypeId].typeString.value, vDevIdNI + separ + vDevIdC + separ + notificationTypeId + separ + eventTypeId);
							//d_defaults.metrics.title = compileTitle('Disarm', cc.data[notificationTypeId].typeString.value, vDevIdNI + separ + vDevIdC + separ + notificationTypeId + separ + eventTypeId);

							var a_vDev = self.controller.devices.create({
								deviceId: a_id,
								defaults: a_defaults,
								overlay: {},
								handler: function(command) {
									if (command === "update") {
										cc.Get(0, notificationTypeId, eventTypeId);
									}
								},
								moduleId: self.id
							});

							/*
							var d_vDev = self.controller.devices.create({
								deviceId: d_id,
								defaults: d_defaults,
								overlay: {},
								handler: function(command) {
									if (command === "on") {
										var vDev = this.controller.devices.get(a_id);
										if (vDev) {
											try {
												vDev.set("metrics:level", "off");
											} catch (e) {}
										}
										this.set("metrics:level", "on"); // update on ourself to allow catch this event
									}
								},
								moduleId: self.id
							});
							*/
							if (a_vDev) {
								self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, notificationTypeId.toString(10), function(type) {
									if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
										self.controller.devices.remove(vDevId + separ + notificationTypeId + separ + eventTypeId + separ + "A");
										//self.controller.devices.remove(vDevId + separ + notificationTypeId + separ + eventTypeId + separ + "D");
									} else {
										if (this.event.value === eventTypeId || this.event.value === 0) {
											try {
												a_vDev.set("metrics:level", (this.event.value && this.status.value) ? "on" : "off");
											} catch (e) {}
										}
									}
								}, "value");
							}
						}
					});
				}
			});
			if (!scaleAdded) {
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "", function(type) {
					if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
						self.parseAddCommandClass(nodeId, instanceId, commandClassId, true);
					}
				}, "child");
			}
		}
	} catch (e) {
		var moduleName = "ZWave",
		langFile = this.controller.loadModuleLang(moduleName),
	   	values = nodeId + "-" + instanceId + "-" + commandClassId + ": " + e.toString();
			
		controller.addNotification("error", langFile.err_dev_create + values, "core", moduleName);
		console.log(e.stack);
	}
};

ZWave.prototype.parseDelCommandClass = function (nodeId, instanceId, commandClassId) {
	nodeId = parseInt(nodeId, 10);
	instanceId = parseInt(instanceId, 10);
	commandClassId = parseInt(commandClassId, 10);

	var self = this,
		separ = "-",
		vDevIdPrefix = "ZWayVDev_" + this.config.name + "_",
		vDevIdNI = nodeId + separ + instanceId,
		vDevIdC = commandClassId,
		vDevId = vDevIdPrefix + vDevIdNI + separ + vDevIdC;

	this.controller.devices.remove(vDevId);
};
