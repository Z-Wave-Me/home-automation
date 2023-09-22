/*** Zigbee Binding module ********************************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>
Copyright: (c) Z-Wave.Me, 2022

******************************************************************************/

if (!String.prototype.padStart) {
	String.prototype.padStart = function padStart(targetLength,padString) {
		targetLength = targetLength>>0; //floor if number or convert non-number to 0;
		padString = String(padString || ' ');
		if (this.length > targetLength) {
			return String(this);
		}
		else {
			targetLength = targetLength-this.length;
			if (targetLength > padString.length) {
				padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
			}
			return padString.slice(0,targetLength) + String(this);
		}
	};
}


function Zigbee(id, controller) {

	// if called without "new", return list of loaded Z-Bee instances
	if (!(this instanceof Zigbee))
		return Zigbee.list();

	Zigbee.super_.call(this, id, controller);

	this.ZWAY_DEVICE_CHANGE_TYPES = {
		"DeviceAdded": 0x01,
		"DeviceRemoved": 0x02,
		"EndPointAdded": 0x04,
		"EndPointRemoved": 0x08,
		"ClusterAdded": 0x10,
		"ClusterRemoved": 0x20,
		"ZDDXSaved": 0x100,
		"EnumerateExisting": 0x200
	};

	this.ZWAY_DATA_CHANGE_TYPE = {
		"Updated": 0x01, // Value updated or child created
		"Invalidated": 0x02, // Value invalidated
		"Deleted": 0x03, // Data holder deleted - callback is called last time before being deleted
		"ChildCreated": 0x04, // New direct child node created

		// ORed flags
		"PhantomUpdate": 0x40, // Data holder updated with same value (only updateTime changed)
		"ChildEvent": 0x80 // Event from child node
	};

	this.CC = {
		"OnOff": 0x0006,
		"LevelControl": 0x0008,
		"DoorLock": 0x0101,
		"ColorControl": 0x0300,
		"OccupancySensing": 0x0406,
		"IasZone": 0x0500,
	};
}

// Module inheritance and setup

inherits(Zigbee, AutomationModule);

_module = Zigbee;

Object.defineProperty(Zigbee, "list", {
	value: function(__, req) {
		// show in the list if called directly (not via web) or role is admin or API is public
		return Object.keys(Zigbee).filter(function(name) {
			return !req || req.role == controller.auth.ROLE.ADMIN || Zigbee[name].publicAPI;
		});
	},
	enumerable: false,
	writable: false,
	configurable: false
});

ws.allowExternalAccess("Zigbee.list", controller.auth.ROLE.ANONYMOUS); // we handle role inside the handler

Zigbee.prototype.updateList = function() {
	this.controller.setNamespace("zbees", this.controller.namespaces, Zigbee.list().map(function(name) {
		return {
			zbeeName: name
		};
	}));
};

Zigbee.prototype.loadObject = function(name) {
	try {
		return loadObject(this.config.name + "_" + name);
	} catch (e) {
		this.addNotification('warning','Error in storage file: '+ name + ' detected. Unable to load data - ERROR: '+ e.toString() + ' File will be rewritten if possible.','z-wave');
		return null;
	}
};

Zigbee.prototype.saveObject = function(name, obj, immediate) {
	return saveObject(this.config.name + "_" + name, obj, immediate);
};

Zigbee.prototype.init = function(config) {
	Zigbee.super_.prototype.init.call(this, config);

	var self = this;

	this.restartBindingCounter = 0;

	this.startBinding();
	if (!this.zbee) {
		return;
	}

	this._dataBind = function(dataBindings, zbeeName, nodeId, endpointId, clusterId, path, func, type) {
		if (zbeeName === self.config.name && self.zbee) {
			self.dataBind(dataBindings, self.zbee, nodeId, endpointId, clusterId, path, func, type);
		}
	};
	this._dataUnbind = function(dataBindings) {
		self.dataUnbind(dataBindings);
	};

	this.controller.on("Zigbee.dataBind", this._dataBind);
	this.controller.on("Zigbee.dataUnbind", this._dataUnbind);

	this.controller.emit("Zigbee.register", this.config.name);
};

Zigbee.prototype.startBinding = function() {
	var self = this;

	try {
		this.zbee = new ZigbeeBinding(this.config.name, this.config.port, this.config.speed || 115200, {
			configFolder: this.config.config || 'config',
			translationsFolder: this.config.translations || 'translations',
			zddxFolder: this.config.ZDDX || 'ZDDX',
			terminationCallback: function() {
				self.terminating.call(self);
			}
		});

		try {
			this.zbee.discover();
		} catch (e1) {
			this.zbee.stop();
			console.log(e1.toString());
			return;
		}
	} catch (e) {
		this.zbee = null;
		console.log(e.toString());
		this.tryRestartLater(e);
		return;
	}

	// started
	this.restartBindingCounter = 0;

	this.fastAccess = false;
	if (!global.zbee) {
		// this is the first zbee - make fast shortcut
		this.fastAccess = true;
	}

	global.Zigbee[this.config.name] = {
		"zbee": this.zbee,
		"port": this.config.port,
		"publicAPI": this.config.publicAPI,
		"fastAccess": this.fastAccess
	};
	this.updateList();

	this.stopped = false;

	if (this.config.enableAPI !== false) {
		this.defineHandlers();
	}

	if (this.fastAccess) {
		if (this.config.enableAPI !== false) {
			this.externalAPIAllow();
		}
		global["zbee"] = this.zbee; // global variable
		global["ZigbeeAPI"] = this.ZigbeeAPI;
	}
	if (this.config.enableAPI !== false) {
		this.externalAPIAllow(this.config.name);
	}
	_.extend(global["Zigbee"][this.config.name], this.ZigbeeAPI);

	if (this.config.createVDev !== false) {
		this.gateDevicesStart();
	}

	this.timeUpdaterStart();

	// save data every hour for hot start
	this.saveDataXMLTimer = setInterval(function() {
		self.zbee.devices.SaveData();
	}, 3600 * 1000);

	var uartSpeed = function(type) {
		var data = this;

		if (type === self.ZWAY_DATA_CHANGE_TYPE["Updated"])
		if (self.config.speed !== data.value) {
			self.config.speed = data.value;
			self.saveConfig();
			self.zbee.stop();
			self.tryRestartLater();
		}

	}
	//TODO//this.zbee.controller.data.hardware.uartSpeed.bind(uartSpeed);
};

Zigbee.prototype.stop = function() {
	console.log("--- Zigbee.stop()");
	Zigbee.super_.prototype.stop.call(this);

	this.stopBinding();

	if (this._dataBind) {
		this.controller.off("Zigbee.dataBind", this._dataBind);
	}
	if (this._dataUnbind) {
		this.controller.off("Zigbee.dataUnbind", this._dataUnbind);
	}
};

Zigbee.prototype.stopBinding = function() {
	this.controller.emit("Zigbee.unregister", this.config.name);

	this.networkReorganization = null;

	if (this.config.createVDev !== false) {
		this.gateDevicesStop();
	}

	this.timeUpdaterStop();

	if (this.fastAccess) {
		if (this.config.enableAPI !== false) {
			this.externalAPIRevoke();
		}
		if (global.zbee) {
			delete global["zbee"];
			delete global["ZigbeeAPI"];
		}
	}

	if (this.config.enableAPI !== false) {
		this.externalAPIRevoke(this.config.name);
	}

	if (global.Zigbee) {
		delete global.Zigbee[this.config.name];
		this.updateList();
	}

	if (this.saveDataXMLTimer) {
		clearInterval(this.saveDataXMLTimer);
		this.saveDataXMLTimer = undefined;
	}

	this.stopped = true;
	if (this.zbee) {
		try {
			this.zbee.stop();
		} catch (e) {
			// Z-Bee has already gone
		}
		this.zbee = null;
	}
};

Zigbee.prototype.tryRestartLater = function(e) {
	var delay = 10;

	if (this.restartBindingCounter < 5) {
		var self = this;

		console.log("Trying to restart Zigbee binding (" + this.config.name + ") in " + delay + " seconds");
		this.restartBindingCounter++;

		setTimeout(function() {
			// retry open after N seconds
			console.log("Restarting Zigbee binding (" + self.config.name + ")");
			self.startBinding();
		}, delay * 1000);

	} else {
		var langFile = this.loadModuleLang();

		console.log("Tried " + this.restartBindingCounter + " times without success. Stopping tries.");
		this.addNotification("critical", langFile.err_binding_start + e.toString(), "z-wave");
	}
};

Zigbee.prototype.terminating = function() {
	if (!this.stopped) {
		console.log("Terminating Zigbee binding");
		this.stopBinding();
		this.tryRestartLater();
	}
};


// --------------- Public HTTP API -------------------


Zigbee.prototype.externalAPIAllow = function(name) {
	var _name = !!name ? ("Zigbee." + name) : "ZigbeeAPI";

	ws.allowExternalAccess(_name, this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".Run", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".Data", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".InspectQueue", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	/*
	ws.allowExternalAccess(_name + ".Backup", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".Restore", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".FirmwareUpdate", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".ZMELicense", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".ZMEFirmwareUpgrade", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".ZMEBootloaderUpgrade", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".EncryptionKeys", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	*/
	// -- see below -- // ws.allowExternalAccess(_name + ".JSONtoXML", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
};

Zigbee.prototype.externalAPIRevoke = function(name) {
	var _name = !!name ? ("Zigbee." + name) : "ZigbeeAPI";

	ws.revokeExternalAccess(_name);
	ws.revokeExternalAccess(_name + ".Run");
	ws.revokeExternalAccess(_name + ".Data");
	ws.revokeExternalAccess(_name + ".InspectQueue");
	/*
	ws.revokeExternalAccess(_name + ".Backup");
	ws.revokeExternalAccess(_name + ".Restore");
	ws.revokeExternalAccess(_name + ".FirmwareUpdate");
	ws.revokeExternalAccess(_name + ".ZMELicense");
	ws.revokeExternalAccess(_name + ".ZMEFirmwareUpgrade");
	ws.revokeExternalAccess(_name + ".ZMEBootloaderUpgrade");
	ws.revokeExternalAccess(_name + ".EncryptionKeys");
	*/
	// -- see below -- // ws.revokeExternalAccess(_name + ".JSONtoXML");
};

Zigbee.prototype.defineHandlers = function() {
	var zbee = this.zbee; // for with() statement in Run and other APIs
	var self = this;

	this.ZigbeeAPI = function() {
		return {
			status: 400,
			body: "Bad ZigbeeAPI request "
		};
	};

	this.ZigbeeAPI.list = function() {
		try {
			return Zigbee.list() || [];
		} catch (e) {
			return {
				status: 500,
				body: e.toString()
			};
		}
	};

	this.ZigbeeAPI.Run = function(url) {
		url = "with(zbee) { " + url.substring(1) + " }";
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
			return {
				status: 500,
				body: e.toString()
			};
		}
	};

	this.ZigbeeAPI.Data = function(url) {
		var timestamp = parseInt(url.substring(1), 10) || 0;
		return {
			status: 200,
			headers: {
				"Content-Type": "application/json"
			},
			body: zbee.data(timestamp)
		};
	};

	this.ZigbeeAPI.InspectQueue = function(url) {
		return {
			status: 200,
			headers: {
				"Content-Type": "application/json"
			},
			body: zbee.InspectQueue()
		};
	};

	/*
	this.ZigbeeAPI.Backup = function(url, request) {
		var now = new Date();

		// create a timestamp in format yyyy-MM-dd-HH-mm
		var ts = getHRDateformat(now);

		try {

			// do backup
			var data = zbee.controller.Backup();
			var filename = "z-way-backup-" + ts + ".zbk"

			return {
				status: 200,
				headers: {
					"Content-Type": "application/x-download",
					"Content-Disposition": "attachment; filename=" + filename
				},
				body: data
			};
		} catch (e) {
			return {
				status: 500,
				body: e.toString()
			};
		}
	};

	this.ZigbeeAPI.Restore = function(url, request) {
		if (request.method === "POST" && request.data && request.data && request.data.config_backup) {
			var full = false;
			if (request.query && request.query.hasOwnProperty("restore_chip_info")) {
				var rci = request.query["restore_chip_info"];
				full = (rci === "yes" || rci === "true" || rci === "1");
			}

			var file = request.data.config_backup;
			if (file endpointof Array) {
				file = file[0];
			}
			if (file.name && file.content && file.length > 0) {
				// valid file object detected
				try {
					zbee.controller.Restore(file.content, full);
					return {
						status: 200,
						headers: {
							"Content-Type": "application/json"
						},
						body: null
					};
				} catch (e) {
					return {
						status: 500,
						body: e.toString()
					};
				}
			}
		}
		return {
			status: 400,
			body: "Invalid request"
		};
	};

	this.ZigbeeAPI.FirmwareUpdate = function(url, request) {
		try {
			var deviceId = parseInt(url.substring(1), 10);
			if (!deviceId) {
				throw "Invalid device id";
			}

			var fwUpdate = zbee.devices[deviceId].FirmwareUpdate;
			if (!fwUpdate) {
				throw "Device doesn't support FW Update";
			}

			var data = request && request.data;
			if (!data) {
				throw "Invalid request";
			}

			var manufacturerId = fwUpdate.data.manufacturerId.value;
			var targetId = parseInt(data.targetId);
			var firmwareId = targetId == 0 ? fwUpdate.data.firmwareId.value : fwUpdate.data["firmware" + targetId].value;
			
			if (!manufacturerId && manufacturerId !== 0 || !firmwareId && firmwareId !== 0) {
				throw "Either manufacturer or firmware id is not present";
			}

			if (targetId === 0 && !fwUpdate.data.upgradeable.value) {
				throw "Firmware is not upgradeable";
			}

			if (data.file && data.file.content) {
				// update firmware from file
				var fw;
				if (data.file.content.substr(0, 1) === ":") {
					// this is a .hex file
					fw = IntelHex2bin(data.file.content);
				} else {
					fw = data.file.content;
				}
				fwUpdate.Perform(manufacturerId, firmwareId, targetId, fw);

				return {
					status: 200,
					body: "Initiating update"
				};
			} else if (data.url) {
				var result = {
					status: 'in progress'
				};
				var d = Date.now() + 300000; // wait no more than 5 min
				// update firmware from url
				http.request({
					url: data.url,
					contentType: "application/octet-stream", // enforce binary response,
					async: true,
					success: function(res) {
						try {
							var data = new Uint8Array(res.data);
							var data_str = "";
							for (var i = 0; i < data.length; i++) {
								data_str += String.fromCharCode(data[i]);
							}
							
							var fw;
							if (data_str.substr(0, 1) === ":") {
								// this is a .hex file
								fw = IntelHex2bin(data_str);
							} else {
								fw = data_str;
							}
							fwUpdate.Perform(manufacturerId, firmwareId, targetId, fw);

							result.status = 'done';
						} catch (e) {
							result.error = 'Firmware download successful. Parsing has failed: ' + e.toString();
							result.status = 'fail';
							throw ('Firmware download successful. Parsing has failed: ' + e.toString());
						}
					},
					error: function(res) {
						result.error = 'Failed to download firmware: ' + res.statusText;
						result.status = 'fail';
						throw ('Failed to download firmware: ' + res.statusText);
					}
				});

				while (Date.now() < d && result.status === "in progress") {
					processPendingCallbacks();
				}

				result.status = result.status === 'in progress' ? 'fail' : result.status;

				if (result.status === 'fail') {
					return {
						status: 500,
						body: result.error
					};
				} else {
					return {
						status: 200,
						body: "Initiating update"
					};
				}
			}

		} catch (e) {
			return {
				status: 500,
				body: e.toString()
			};
		}
	};

	this.ZigbeeAPI.ZMELicense = function(url, request) {
		try {
			var data = request && request.data;
			if (!data || !data.license) {
				throw "Invalid request";
			}

			var result = "in progress";
			
			var func, lic;
			if (parseFloat(zbee.controller.data.SDK.value.substr(0, 4)) >= 7.12) {
				func = zbee.ZMELicenseSet;
				lic = data.license.match(/.{2}/g).map(function(i, v) { return parseInt(i, 16); });
			} else {
				func = zbee.ZMECapabilities;
				lic = data.license.split(",").map(function(i) { return parseInt(i, 10); });
			}
			
			func.call(zbee, lic, function() {
				result = "done";
			}, function() {
				result = "failed";
			});

			var d = Date.now() + 20000; // wait not more than 20 seconds

			while (Date.now() < d && result === "in progress") {
				processPendingCallbacks();
			}

			if (result === "in progress") {
				result = "failed";
			}
			return (result === "done") ? {
				status: 200,
				body: "Done"
			} : {
				status: 500,
				body: "Failed"
			};
		} catch (e) {
			return {
				status: 500,
				body: e.toString()
			};
		}
	};

	this.ZigbeeAPI.ZMEFirmwareUpgrade = function(url, request) {
		try {
			var data = request && request.data;
			if (!data) {
				throw "Invalid request";
			}

			var result = "in progress";

			if (zbee.controller.data.SDK.value === null) {
				console.log("Unknown SDK version - update Z-Way");
				throw "Unknown SDK version - update Z-Way";
			}

			var L = 32,
				addr,
				skip1800;

			if (parseFloat(zbee.controller.data.SDK.value.substr(0, 4)) >= 7.12) {
				// ZGM130S/ZG14
				skip1800 = false;
				addr = 0x3A000;
			} else {
				// ZM5101/SD3503/ZM5202
				if (zbee.controller.data.manufacturerId.value === 0) { // Z-Wave.Me Hub
					skip1800 = true;
					addr =  0x7800; // M25PE10
				} else {
					skip1800 =
						zbee.controller.data.bootloader.crc.value !== 0x8aaa // bootloader for RaZberry 6.70
						&&
						zbee.controller.data.bootloader.crc.value !== 0x7278 // bootloader for UZB 6.70
						&&
						zbee.controller.data.bootloader.crc.value !== 0x9d04 // bootloader for UZB 6.70
						&&
						zbee.controller.data.bootloader.crc.value !== 0x8b4b // bootloader for Z-Box 6.70
						&&
						parseFloat(zbee.controller.data.SDK.value.substr(0, 4)) < 6.71; // bootloader for 6.71 SDK
					addr = skip1800 ? 0x7800: 0x20000; // M25PE40 on old and new SDKs
				}
			}

			if (data.file && data.file.content) {
				console.log("Fetching firmware from file " + data.file.name);

				var buf = new ArrayBuffer(data.file.content.length);
				var bufView = new Uint8Array(buf);
				for (var i = 0; i < data.file.content.length; i++) {
					bufView[i] = data.file.content.charCodeAt(i);
				}

				var data = skip1800 ? buf.slice(0x1800) : buf;

				for (var i = 0; i < data.byteLength; i += L) {
					var arr = (new Uint8Array(data.slice(i, i + L)));
					if (arr.length == 1) {
						arr = [arr[0]]
						arr.push(0xff); // we only need one byte, but a due to some error single byte is not read
					}
					zbee.NVMExtWriteLongBuffer(addr + i, arr);
				}

				zbee.NVMExtWriteLongBuffer(addr - 2, [0, 1], // we only need one byte, but a due to some error single byte is not read
					function() {
						zbee.SerialAPISoftReset(function() {
							result = "done";
							zbee.stop(); // to force re-start Z-Way
						});
					});
			} else if (data.url) {
				console.log("Fetching firmware from " + data.url);

				http.request({
					url: data.url,
					async: true,
					contentType: "application/octet-stream",
					success: function(response) {
						var data = skip1800 ? response.data.slice(0x1800) : response.data;

						for (var i = 0; i < data.byteLength; i += L) {
							var arr = (new Uint8Array(data.slice(i, i + L)));
							if (arr.length == 1) {
								arr = [arr[0]]
								arr.push(0xff); // we only need one byte, but a due to some error single byte is not read
							}
							zbee.NVMExtWriteLongBuffer(addr + i, arr);
						}

						zbee.NVMExtWriteLongBuffer(addr - 2, [0, 1], // we only need one byte, but a due to some error single byte is not read
							function() {
								zbee.SerialAPISoftReset(function() {
									result = "done";
									zbee.stop(); // to force re-start Z-Way
								});
							});
					},
					error: function(res) {
						console.error("Failed to download firmware: " + res.statusText);
						result = "failed";
					}
				});
			} else {
				console.error("Wrong request. Failed to apply firmware.");
				result = "failed";
			}

			var d = Date.now() + 300 * 1000; // wait not more than 5 minutes

			while (Date.now() < d && result === "in progress") {
				processPendingCallbacks();
			}

			if (result === "in progress") {
				result = "failed";
			}

			return (result === "done") ? {
				status: 200,
				body: "Done"
			} : {
				status: 500,
				body: "Failed"
			};
		} catch (e) {
			return {
				status: 500,
				body: e.toString()
			};
		}
	};

	this.ZigbeeAPI.ZMEBootloaderUpgrade = function(url, request) {
		try {
			var data = request && request.data;
			if (!data) {
				throw "Invalid request";
			}

			var result = "in progress";

			if (data.file && data.file.content) {
				console.log("Fetching bootloader from file " + data.file.name);
				
				var buf = new ArrayBuffer(data.file.content.length);
				var bufView = new Uint8Array(buf);
				for (var i = 0; i < data.file.content.length; i++) {
					bufView[i] = data.file.content.charCodeAt(i);
				}
				var data = buf;

				if (parseFloat(zbee.controller.data.SDK.value.substr(0, 4)) >= 7.12) {
					var arr = (new Uint8Array(data.slice(0, 30)));
					zbee.ZMEBootloaderLoadFlash(data.slice(0, 5), function() {
						result = "done";
						zbee.stop(); // to force re-start Z-Way
					}, function() {
						result = "failed";
					});
				} else {
					var L = 32,
						seg = 6, // Функция бутлодера принимает номер сегмента
						addr = seg * 0x800; // ==12k

					for (var i = 0; i < data.byteLength; i += L) {
						var arr = (new Uint8Array(data.slice(i, i + L)));
						if (arr.length == 1) {
							arr = [arr[0]]
							arr.push(0xff); // we only need one byte, but a due to some error single byte is not read
						}
						zbee.NVMExtWriteLongBuffer(addr + i, arr);
					}

					zbee.NVMExtWriteLongBuffer(addr - 2, [0, 0], // we only need one byte, but a due to some error single byte is not read
						function() {
							//Вызываем перезапись bootloder
							zbee.ZMEBootloaderFlash(seg, function() {
								result = "done";
								zbee.stop(); // to force re-start Z-Way
							}, function() {
								result = "failed";
							});
						});
				}
			} else if (data.url) {
				http.request({
					url: data.url,
					async: true,
					contentType: "application/octet-stream",
					success: function(response) {
						if (parseFloat(zbee.controller.data.SDK.value.substr(0, 4)) >= 7.12) {
							zbee.ZMEBootloaderLoadFlash(data, function() {
								result = "done";
								zbee.stop(); // to force re-start Z-Way
							}, function() {
								result = "failed";
							});
						} else {
							var L = 32,
								seg = 6, // Функция бутлодера принимает номер сегмента
								addr = seg * 0x800, // ==12k
								data = response.data;

							for (var i = 0; i < data.byteLength; i += L) {
								var arr = (new Uint8Array(data.slice(i, i + L)));
								if (arr.length == 1) {
									arr = [arr[0]]
									arr.push(0xff); // we only need one byte, but a due to some error single byte is not read
								}
								zbee.NVMExtWriteLongBuffer(addr + i, arr);
							}

							zbee.NVMExtWriteLongBuffer(addr - 2, [0, 0], // we only need one byte, but a due to some error single byte is not read
								function() {
									//Вызываем перезапись bootloder
									zbee.ZMEBootloaderFlash(seg, function() {
										result = "done";
										zbee.stop(); // to force re-start Z-Way
									}, function() {
										result = "failed";
									});
								});
						}
					},
					error: function(res) {
						console.error("Failed to download bootloader: " + res.statusText);
						result = "failed";
					}
				});
			} else {
				console.error("Wrong request. Failed to apply bootloader.");
				result = "failed";
			}

			var d = Date.now() + 60 * 1000; // wait not more than 60 seconds

			while (Date.now() < d && result === "in progress") {
				processPendingCallbacks();
			}

			if (result === "in progress") {
				result = "failed";
			}
			return (result === "done") ? {
				status: 200,
				body: "Done"
			} : {
				status: 500,
				body: "Failed"
			};
		} catch (e) {
			return {
				status: 500,
				body: e.toString()
			};
		}
	};

	this.ZigbeeAPI.EncryptionKeys = function () {
		var filename = ('00000000' + (zbee.controller.data.homeId.value + (zbee.controller.data.homeId.value < 0 ? 0x100000000 : 0)).toString(16)).slice(-8)
		var reply = {
			status: 200,
			headers: {
				"Content-Type": "text/plain", // application/x-download octet-stream
				"Content-Disposition": "attachment; filename=" + filename.toUpperCase() + ".txt",
			},
			body: null,
			error: null,
			message: null
		};
		var networkKeys = [zbee.devices[zbee.controller.data.nodeId.value].data.networkKey.value];
		var keys = zbee.devices[zbee.controller.data.nodeId.value].data.networkKeys;
		if (keys) {
			networkKeys.push(keys.S2Unauthenticated.value, keys.S2Authenticated.value, keys.S2Access.value);
		}
		if (keys.S2AuthenticatedLR) {
			networkKeys.push(keys.S2AuthenticatedLR.value, keys.S2AccessLR.value)
		}

		reply.body = networkKeys.map(function (key, index) {
			return (index ? '9F' : '98') + ';' + (key ? key : new Array(16).fill(0))
				.map(function (e) {return (+e).toString(16).padStart(2, '0').toUpperCase()}).join('') + ';1';
		}).join('\r\n');

		return reply;
	}
	*/
};


// ------------- Data Binding --------------

Zigbee.prototype._dataBind = function(dataBindings, zbeeName, nodeId, endpointId, clusterId, path, func, type) {
	if (zbeeName === this.config.name) {
		this.dataBind(dataBindings, this.zbee, nodeId, endpointId, clusterId, path, func, type);
	}
}
Zigbee.prototype.dataBind = function(dataBindings, zbee, nodeId, endpointId, clusterId, path, func, type) {
	// three prototypes:
	//  (dataBindings, zbee, nodeId, endpointId, clusterId, path, func, type)
	//  (dataBindings, zbee, nodeId,                             path, func)
	//  (dataBindings, zbee,                                     path, func) // bind to controller data

	var pathArr = [],
		data = null,
		ctrlBind = is_function(endpointId),
		devBind = is_function(clusterId);

	if (ctrlBind) {
		path = nodeId;
		func = endpointId;
		nodeId = undefined;
		endpointId = undefined;
		clusterId = undefined;
		data = zbee.controller.data;
	} else if (devBind) {
		path = endpointId;
		func = clusterId;
		endpointId = undefined;
		clusterId = undefined;
		data = zbee.devices[nodeId].data;
	} else {
		data = zbee.devices[nodeId].endpoints[endpointId].clusters[clusterId].data;
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
		if (ctrlBind) {
			dataBindings.push({
				"zbee": zbee,
				"path": path,
				"func": data.bind(func, false)
			});
		} else if (devBind) {
			dataBindings.push({
				"zbee": zbee,
				"nodeId": nodeId,
				"path": path,
				"func": data.bind(func, nodeId, false)
			});
		} else {
			dataBindings.push({
				"zbee": zbee,
				"nodeId": nodeId,
				"endpointId": endpointId,
				"clusterId": clusterId,
				"path": path,
				"func": data.bind(func, null, type === "child")
			});
			if (type === "value") {
				func.call(data, this.ZWAY_DATA_CHANGE_TYPE.Updated);
			}
		}
	} else {
		console.log("Can not find data path:", nodeId, endpointId, clusterId, path);
	}
};

Zigbee.prototype.dataUnbind = function(dataBindings) {
	dataBindings.forEach(function(item) {
		var ctrlBind = !("nodeId" in item),
			devBind = !("endpointId" in item);

		if (item.zbee && item.zbee.isRunning() && (ctrlBind || (item.zbee.devices[item.nodeId] && (devBind || (item.zbee.devices[item.nodeId].endpoints[item.endpointId] && item.zbee.devices[item.nodeId].endpoints[item.endpointId].clusters[item.clusterId]))))) {
			var data = ctrlBind ? item.zbee.controller.data : (devBind ? item.zbee.devices[item.nodeId].data : item.zbee.devices[item.nodeId].endpoints[item.endpointId].clusters[item.clusterId].data),
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
				console.log("Can not find data path:", item.nodeId, item.endpointId, item.clusterId, item.path);
			}
		}
	});
	dataBindings = null;
};

// ------------- Update time every day -----

Zigbee.prototype.timeUpdaterStart = function() {
	var self = this;
	
	this.controller.emit("cron.addTask", "ZigbeeTimeUpdater.poll", {
		minute: 0,
		hour: 3,
		weekDay: null,
		day: null,
		month: null
	});

	// add event listener
	this.timeUpdater = function() {
		var devices = Object.keys(self.zbee.devices);
		devices.forEach(function(nodeId) {
			if (nodeId == self.zbee.controller.data.nodeId.value) return; // not a strict === since nodeId is a string index, but number in DH
			
			if (self.zbee.devices[nodeId].TimeParameters)
				self.zbee.devices[nodeId].TimeParameters.Set();
			if (self.zbee.devices[nodeId].Clock)
				self.zbee.devices[nodeId].Clock.Set();
		});
	};

	this.controller.on("ZigbeeTimeUpdater.poll", this.timeUpdater);
};

Zigbee.prototype.timeUpdaterStop = function() {
	this.controller.emit("cron.removeTask", "ZigbeeTimeUpdater.poll");

	if (this.timeUpdater)
		this.controller.off("ZigbeeTimeUpdater.poll", this.timeUpdater);
}

// ----------------- Devices Creator ---------------


Zigbee.prototype.gateDevicesStart = function() {

	var self = this,
		fixesDone = [];

	this.gateDataBinding = [];

	// Bind to all future ClusterClasses changes
	this.gateBinding = this.zbee.bind(function(type, nodeId, endpointId, clusterId) {
		if (type === self.ZWAY_DEVICE_CHANGE_TYPES["ClusterAdded"]) {
			self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "interviewDone", function(type) {
				if (this.value === true && type !== self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {

					var create = true,
						changeVDev = {},
						deviceData = self.zbee.devices[nodeId].data,
						deviceEndPoints = self.zbee.devices[nodeId].endpoints,
						deviceCC = deviceEndPoints[endpointId].clusters[clusterId],
						c = self.zbee.controller,
						mC = deviceData.manufacturerCode.value ? deviceData.manufacturerCode.value : null,
						//appMajor = deviceData.applicationMajor.value ? deviceData.applicationMajor.value : null,
						//appMinor = deviceData.applicationMinor.value ? deviceData.applicationMinor.value : null,
						givenName = null,
						devId,
						//appMajorId,
						//appMajorMinorId,
						postFix;
						//fixes = self.postfix.fixes ? self.postfix.fixes : self.postfix;

					// try to get fix by manufacturerProductId and application Version
					/* TODO - commented since mC and appMajor are to be implemented in the future
					if (!!mId && !!mPT && !!mPId && !!self.postfix) {

						devId = mId + '.' + mPT + '.' + mPId;
						appMajorId = devId + '.' + appMajor;
						appMajorMinorId = devId + '.' + appMajor + '.' + appMinor;
						postFix = fixes.filter(function(fix) {
							return 	fix.p_id === mId.toString() || //search by manufacturerId
								fix.p_id === devId || //search by manufacturerProductId
								fix.p_id === appMajorId || //search by applicationMajor
								fix.p_id === appMajorMinorId; //search by applicationMajor and applicationMinor
						});
					}
					*/

					// ----------------------------------------------------------------------------
					// --- postfix functions
					// ----------------------------------------------------------------------------

					// add SwitchController support by entering (runs once after inclusion):
					// instId ... endpoint ID
					// cluster ... Cluster Class ID
					// minBtnNr ... starting button number
					// maxBtnNr ... maximum button number
					// type ... 'S' for 'scene' and 'B' for 'button' or 'switchControl'
					function scenesSupport(instId, cluster, minBtnNr, maxBtnNr, type) {
						var trapArray = [],
							cluster = cluster || null;

						trapArray = self.controller.endpoints.filter(function(endpoint) {
							return endpoint.moduleId === 'SwitchControlGenerator';
						});
						if (instId === endpointId && clusterId === cluster && deviceCC && c.data.lastIncludedDevice.value === nodeId) {
							maxBtnNr = (deviceCC.data.maxScenes && deviceCC.data.maxScenes.value && deviceCC.data.maxScenes.value <= maxBtnNr ? deviceCC.data.maxScenes.value : maxBtnNr) || 0

							if (trapArray[0].params.generated.indexOf('ZBeeVDev_zbee_Remote_' + nodeId + '-' + endpointId + '-0-1') === -1) {
								for (i = minBtnNr; i <= maxBtnNr; i++) {
									this.controller.emit('SwitchControlGenerator.register', self.config.name, nodeId, endpointId, '0', i, type);
									console.logJS(i, minBtnNr, maxBtnNr);

									// console output
									console.log('#######################', 'ADD SWITCHCONTROLGENERATOR SUPPORT TO #' + nodeId, '###############################');
									console.log('###');
									console.log('###', 'Add support for endpoint ' + instId + ':');
									console.log('###', 'CC:', cluster);
									console.log('###', 'Set maximum number of buttons / secnes to :', maxBtnNr);
									console.log('###', 'Add virtual devices as type button (B) or scene (S):', type);
									console.log('###');
									console.log('############################################################################################################');
								}
							}
						}
					}

					// set device config by entering (runs once after inclusion):
					// instId ... endpoint ID
					// parameter ... id of the parameter that should be changed. Can be 0 ... 0xff
					// value ... new value. Can be 0 ... 0xffffffff
					// size ... 0 for auto or 1, 2, 4 (Byte)
					function setConfig(instId, parameter, value, size) {
						var parameter = Number.isInteger(parseInt(parameter)) ? parseInt(parameter) : null,
							value = Number.isInteger(parseInt(value)) ? parseInt(value) : null,
							size = parseInt(size) || null;

						if (instId === endpointId && parameter !== null && !!value !== null && size !== null) {
							// set config after inclusion only and if it doesn't exist or isn't equal
							if (clusterId === 112 && deviceCC && c.data.lastIncludedDevice.value === nodeId && (!deviceCC.data[parameter] || (deviceCC.data[parameter] && deviceCC.data[parameter].val.value !== value))) {
								deviceCC.Set(parameter, value, size);

								// console output
								console.log('#######################', 'CHANGE CONFIGURATION OF #' + nodeId, '###############################');
								console.log('###');
								console.log('###', 'Change configuration of endpoint ' + instId + ':');
								console.log('###', 'parameter:', parameter);
								console.log('###', 'value:', value);
								console.log('###', 'size:', size);
								console.log('###');
								console.log('###############################################################################################');
							}
						}
					}

					// change CC entries by entering (runs once after inclusion):
					// instId ... endpoint ID
					// cluster ... Cluster Class ID
					// dataType ... data type object that should be changed -e.g. security, version, interviewDone
					// key ... of this data type object
					// value ... new value
					function setCCData(instId, cluster, dataType, key, value) {
						var cluster = parseInt(cluster, 10);

						if (clusterId === cluster &&
							deviceEndPoints[instId].clusters[cluster] &&
							c.data.lastIncludedDevice.value === nodeId) {

							// set value
							if (typeof value !== 'undefined' &&
								deviceEndPoints[instId].clusters[cluster].data[dataType] &&
								deviceEndPoints[instId].clusters[cluster].data[dataType][key] !== value) {

								deviceEndPoints[instId].clusters[cluster].data[dataType][key] = value;

								// console output
								console.log('#######################', 'SET COMMANDCLASS DATA OF:', devId, '################################');
								console.log('###');
								console.log('###', 'Change CC entry of endpoint ' + instId + ':');
								console.log('###', 'CC:', cluster);
								console.log('###', 'data type object that has changed:', dataType);
								console.log('###', 'new value for ' + key + ':', value);
								console.log('###');
								console.log('##############################################################################################');
							}
						}
					}

					// change device entries by entering (runs once after inclusion):
					// dataType ... data type object that should be changed -e.g. security, version, interviewDone
					// key ... of this data type object
					// value ... new value
					function setDeviceData(dataType, key, value) {
						if (c.data.lastIncludedDevice.value === nodeId) {

							// set value
							if (typeof value !== 'undefined' &&
								deviceData[dataType] &&
								deviceData[dataType][key] !== value) {

								deviceData[dataType][key] = value;

								// console output
								console.log('#######################', 'SET DEVICE DATA OF:', devId, '################################');
								console.log('###');
								console.log('###', 'Change Device entry:');
								console.log('###', 'data type object that has changed:', dataType);
								console.log('###', 'new value for ' + key + ':', value);
								console.log('###');
								console.log('##############################################################################################');
							}
						}
					}

					// change the node name (runs once after inclusion):
					function renameNode(nodeName) {

						if (nodeName !== deviceData.givenName.value) {

							// do something
							deviceData.givenName.value = nodeName && nodeName !== '' && !!nodeName ? nodeName : deviceData.givenName.value;

							// console output
							console.log('#######################', 'Apply postfix #' + nodeId, '################################');
							console.log('###');
							console.log('###', 'Change node name to: ', nodeName);
							console.log('###');
							console.log('######################################################################################');
						}
					}

					// ----------------------------------------------------------------------------
					// --- END
					// ----------------------------------------------------------------------------

					if (postFix) {
						if (postFix.length > 0) {
							try {
								// works of course only during inclusion - after restart hidden elements are visible again
								if (!!nodeId && c.data.lastIncludedDevice.value === nodeId) {
									var intDone = deviceCC.data.interviewDone.value;
									intDelay = Date.now() + 5 * 1000; // wait not more than 5 seconds for single interview

									// wait till interview is done
									while (Date.now() < intDelay && intDone === false) {
										intDone = deviceCC.data.interviewDone.value;
									}

									if (intDone === false) {
										try {
											// call preInteview functions from postfix.json
											postFix.forEach(function(fix) {
												if (!!fix.preInterview && fix.preInterview && fix.preInterview.length > 0) {
													fix.preInterview.forEach(function(func) {
														eval(func);
													});
												}
											});
										} catch (e) {
											// console output
											console.log('##############', 'INTERVIEW-HAS-FAILED-----PREFIX-HAS-FAILED:', '#' + nodeId, '#######################');
											console.log('###');
											console.log('###', 'ERROR:', e.toString());
											console.log('###');
											console.log('######################################################################################################');
										}
									}
								}

								// call postInterview functions from postfix.json
								postFix.forEach(function(fix) {
									if (!!fix.postInterview && fix.postInterview && fix.postInterview.length > 0) {
										fix.postInterview.forEach(function(entry) {
											var splittedEntry = entry.split(','),
												devICC = endpointId + '-' + clusterId;

											if (splittedEntry.length > 0) {
												switch (splittedEntry[0]) {
													case 'rename':
													case 'hide':
													case 'deactivate':
													case 'icon':
													case 'probeType':
														if (splittedEntry[1] && splittedEntry[1].indexOf(devICC) > -1 && c.data.lastIncludedDevice.value === nodeId) {
															//add devId
															var nId = nodeId + '-' + splittedEntry[1];

															if (!changeVDev[nId]) {
																changeVDev[nId] = {};
															}

															// devId (instId-CC-sCC-eT) / postFix type / value - fallback true for hide / deactivate
															changeVDev[nId][splittedEntry[0]] = splittedEntry[2] ? splittedEntry[2] : true;
														}

														break;
													case 'discreteState':
														if (splittedEntry[1] && splittedEntry[1].indexOf(devICC) > -1 && c.data.lastIncludedDevice.value === nodeId) {
															//add devId
															var nId = nodeId + '-' + splittedEntry[1];

															if (!changeVDev[nId]) {
																changeVDev[nId] = {};
															}

															if (!changeVDev[nId]['discreteState']) {
																changeVDev[nId]['discreteState'] = {};
															}

															// devId (instId-CC-sCC-eT) / postFix type / scene + keyAttribute / value - fallback undefined
															changeVDev[nId]['discreteState'][splittedEntry[2]] = {
																cnt: splittedEntry[3] ? splittedEntry[3] : undefined,
																action: splittedEntry[4] ? splittedEntry[4] : undefined,
																type: splittedEntry[5] ? splittedEntry[5] : undefined
															};
														}

														break;
													case 'noVDev':
														if (splittedEntry[1] && splittedEntry[1].indexOf(devICC) > -1) {
															var nId = nodeId + '-' + splittedEntry[1];

															//add devId
															if (!changeVDev[nId]) {
																changeVDev[nId] = {};
															}

															// devId (instId-CC-sCC-eT) without creation
															changeVDev[nId].noVDev = true;
														}

														break;
													case 'renameNode':
														if (splittedEntry[1] && c.data.lastIncludedDevice.value === nodeId) {
															renameNode(splittedEntry[1]);
														}

														break;
													case 'emulateOff':
														if (splittedEntry[1] && splittedEntry[2]) {
															var nId = nodeId + '-' + splittedEntry[1];

															if (!changeVDev[nId]) {
																changeVDev[nId] = {};
															}

															changeVDev[nId].emulateOff = splittedEntry[2];
														}

														break;
													case 'configVDev':
														// configVDev, i, cfg#, type, func1, func2, title
														if (splittedEntry[1] && splittedEntry[2] && splittedEntry[3] && splittedEntry[4] && splittedEntry[5]) {
															var nId = nodeId + '-' + splittedEntry[1] + '-112';

															if (!changeVDev[nId]) {
																changeVDev[nId] = {};
															}

															if (!changeVDev[nId]['configVDev']) {
																changeVDev[nId]['configVDev'] = {};
															}

															changeVDev[nId]['configVDev'][splittedEntry[2]] = {
																type: splittedEntry[3],
																p2v: splittedEntry[4],
																v2p: splittedEntry[5],
																title: splittedEntry[6] || ('Config #' + splittedEntry[2])
															};
														}

														break;
													case 'tilt':
														if (splittedEntry[1] && splittedEntry[1].indexOf(devICC) > -1) {
															var nId = nodeId + '-' + splittedEntry[1];

															//add devId
															if (!changeVDev[nId]) {
																changeVDev[nId] = {};
															}
														
															changeVDev[nId].tilt = true;
														}

														break;
													case 'notificationStatus':
														if (splittedEntry[1] && splittedEntry[1].indexOf(devICC) > -1) {
															var nId = nodeId + '-' + splittedEntry[1];

															//add devId
															if (!changeVDev[nId]) {
																changeVDev[nId] = {};
															}
														
															changeVDev[nId].notificationStatus = true;
														}

														break;														
													default:
														eval(entry);
												}
											}
										});
									}
								});
							} catch (e) {
								// console output
								console.log('#######################', 'PRE-OR-POSTFIX-ERROR:', '#' + nodeId, '################################');
								console.log('###');
								console.log('###', 'ERROR:', e.toString());
								console.log('###');
								console.log('#################################################################################################');
							}
						}
					}

					var ccId = nodeId + '-' + endpointId + '-' + clusterId;

					if (!changeVDev[ccId] || (changeVDev[ccId] && !changeVDev[ccId].noVDev)) {
						self.parseAddClusterClass(nodeId, endpointId, clusterId, false, changeVDev);
					} else if (changeVDev[ccId] && changeVDev[ccId].noVDev) {
						var devId = "ZBeeVDev_" + self.config.name + "_" + nodeId + '-' + ccId;
						// console output
						console.log('#######################', 'Apply postfix for:', devId, '################################');
						console.log('###');
						console.log('###', 'not created');
						console.log('###');
						console.log('########################################################################################');
					}

					if (!deviceData.givenName.value || deviceData.givenName.value == '') {
						// set givenName
						deviceData.givenName.value = givenName? givenName : self.nodeNameByType(nodeId, deviceData);
					}
				} else {
					self.parseDelClusterClass(nodeId, endpointId, clusterId);
				}
			}, "value");
		} else {
			self.parseDelClusterClass(nodeId, endpointId, clusterId);
		}
	}, this.ZWAY_DEVICE_CHANGE_TYPES["ClusterAdded"] | this.ZWAY_DEVICE_CHANGE_TYPES["ClusterRemoved"] | this.ZWAY_DEVICE_CHANGE_TYPES["EnumerateExisting"]);

	self.dataBind(self.gateDataBinding, self.zbee, "lastExcludedDevice", function(type) {
		var _id = this.value,
			_toRemove = self.controller.devices.filter(function(el) {
				return el.id.indexOf("ZBeeVDev_" + self.config.name + "_" + _id + '-') === 0;
			}).map(function(el) {
				return el.id;
			}).concat(
				Object.keys(self.controller.vdevInfo).filter(function(__id) {
					return __id.indexOf("ZBeeVDev_" + self.config.name + "_" + _id + '-') === 0;
				})
			);

		_toRemove.forEach(function(name) {
			self.controller.devices.remove(name);
			self.controller.devices.cleanup(name);
		});
	}, "");
};

Zigbee.prototype.gateDevicesStop = function() {
	var self = this;

	// delete devices
	this.controller.devices.map(function(el) {
		return el.id;
	}).filter(function(el) {
		return el.indexOf("ZBeeVDev_" + self.config.name + "_") === 0;
	}).forEach(function(el) {
		try {
			self.controller.devices.remove(el);
		} catch (e) {
			// do nothing - this is to prevent Stop abort to make sure we release zbee context in C
		}
	});

	// releasing bindings
	try {
		if (this.gateDataBinding) {
			this.dataUnbind(this.gateDataBinding);
		}
		if (this.zbee) {
			this.zbee.unbind(this.gateBinding);
		}
	} catch (e) {
		// Z-Bee already gone, skip deallocation
		//this.zbee = null;
	}
};

Zigbee.prototype.addVDevInfo = function(info, nodeId) {
	var manufacturerName = "", modelIdentifier = "", swBuildId = "";
	if (this.zbee.devices[nodeId].endpoints[1] && this.zbee.devices[nodeId].endpoints[1].Basic) {
		var basicData = this.zbee.devices[nodeId].endpoints[1].Basic.data;
		manufacturerName = basicData.manufacturerName ? basicData.manufacturerName.value : "";
		modelIdentifier = basicData.modelIdentifier ? basicData.modelIdentifier.value : "";
		swBuildId = basicData.swBuildId ? basicData.swBuildId.value : "";
	}
	_.extend(info, {
		technology: "Zigbee",
		manufacturer: manufacturerName,
		product: modelIdentifier,
		firmware: swBuildId,
		location: 0,
	});
}

Zigbee.prototype.compileTitle = function(nodeId, endpointId, title, type, addVendor) { // accepts more arguments, see code
	var sortArgs = [];

	// add vendor name
	if (addVendor === undefined || addVendor === true) {
		if (this.zbee.devices[nodeId].endpoints[1] && this.zbee.devices[nodeId].endpoints[1].Basic) {
			var vendorName = this.zbee.devices[nodeId].endpoints[1].Basic.data.manufacturerName ? this.zbee.devices[nodeId].endpoints[1].Basic.data.manufacturerName.value : "";
			if (vendorName) {
				sortArgs.push(vendorName);
			}
		}
	}

	sortArgs.push(title);

	// add probeType
	if (type) {
		sortArgs.push(type);
	}

	// add id
	sortArgs.push("(" + nodeId + (endpointId ? "." + endpointId : "") + ")");

	return sortArgs.join(' ');
};

Zigbee.prototype.applyPostfix = function(defaultObj, changeObj, nodeId, endpointId, title, type, addVendor) {
	this.addVDevInfo(defaultObj, nodeId);
	
	defaultObj.metrics.title = this.compileTitle(nodeId, endpointId, title, type, addVendor);
	
	if (changeObj) {
		if (changeObj.noVDev) return false;
		
		if (changeObj.probeType)
			defaultObj.probeType = changeObj.probeType;
		if (changeObj.icon)
			defaultObj.metrics.icon = changeObj.icon;
		if (changeObj.rename)
			defaultObj.metrics.title = this.compileTitle(nodeId, endpointId, changeObj.rename, undefined, false);
		defaultObj.visibility = changeObj.hide ? false : true;
		defaultObj.permanently_hidden = changeObj.deactivate ? true : false;
	
		if (changeObj.discreteState && !_.isEmpty(changeObj.discreteState) && defaultObj.metrics.discreteStates) {
			defaultObj.metrics.discreteStates = changeObj.discreteState;
		}
	}
	return true;
};

Zigbee.prototype.parseAddClusterClass = function(nodeId, endpointId, clusterId, scaleAdded, changeVDev) {
	nodeId = parseInt(nodeId, 10);
	endpointId = parseInt(endpointId, 10);
	clusterId = parseInt(clusterId, 10);

	// avoid errors during binding stop and device exclusion
	if (!this.zbee || !this.zbee.devices[nodeId]) {
		return;
	}

	var self = this,
		endpoint = this.zbee.devices[nodeId].endpoints[endpointId],
		endpointClusterClasses = Object.keys(endpoint.clusters).map(function(x) {
			return parseInt(x);
		}),
		cc = endpoint.clusters[clusterId],
		separ = "-",
		vDevIdPrefix = "ZBeeVDev_" + this.config.name + "_",
		vDevIdNI = nodeId + separ + endpointId,
		vDevIdC = clusterId,
		vDevId = vDevIdPrefix + vDevIdNI + separ + vDevIdC,
		changeDevId = vDevIdNI + separ + vDevIdC,
		defaults;
	// vDev is not in this scope, but in {} scope for each type of device to allow reuse it without closures

	try {
		if (!cc) {
			return; // do not handle destroyed Cluster Classes
		}

		if (!cc.data.inDirection.value) {
			return; // do not handle unsupported Cluster Classes
		}

		if (this.CC["OnOff"] === clusterId && !self.controller.devices.get(vDevId)) {
			var icon = "switch";
			var probeType = "switch";

			//TODO How to guess the icon type?
			/*
			switch (this.zbee.devices[nodeId].data.specificType.value) {
				case 0x01:
					probeType = "power_switch_binary";
					break;
				case 0x03:
					probeType = "scene_switch_binary";
					break;
				case 0x04:
					probeType = "power_strip";
					break;
				case 0x05:
					icon = "siren";
					probeType = "siren";
					break;
				case 0x06:
					icon = "valve";
					probeType = "valve";
					break;
				default:
					probeType = "switch";
					break;
			};
			*/

			defaults = {
				deviceType: "switchBinary",
				probeType: probeType,
				metrics: {
					icon: icon,
					isFailed: false
				}
			};

			if (!this.applyPostfix(defaults, changeVDev[changeDevId], nodeId, endpointId, 'Switch')) return;

			var vDev = this.controller.devices.create({
				deviceId: vDevId,
				defaults: defaults,
				overlay: {},
				handler: function(command) {
					if ("on" === command) {
						cc.Set(true);
					} else if ("off" === command) {
						cc.Set(false);
					} else if ("update" === command) {
						cc.Get();
					}
				},
				moduleId: self.id
			});

			if (vDev) {
				//TODO isFailed // vDev.set('metrics:isFailed', this.zbee.devices[nodeId].data.isFailed.value);
				this.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "onOff", function(type) {
					try {
						if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
							vDev.set("metrics:level", this.value ? "on" : "off");
						}
					} catch (e) {}
				}, "value");
			}
		} else if (this.CC["LevelControl"] === clusterId && !self.controller.devices.get(vDevId)) {
			var icon;
			var title;
			var probeType = 'multilevel';
			/* TODO how to detect it in Zigbee?
			if (this.zbee.devices[nodeId].data.genericType.value === 0x11 && _.contains([0x03, 0x05, 0x06, 0x07], this.zbee.devices[nodeId].data.specificType.value)) {
				icon = 'blinds'; // or alternatively window
				probeType = 'motor';
				title = 'Blind';
			} else if (this.zbee.devices[nodeId].data.genericType.value === 0x11 && this.zbee.devices[nodeId].data.specificType.value == 0x08) {
				icon = 'fan';
				title = 'Fan';
			} else */ {
				icon = 'multilevel';
				title = 'Dimmer';
			}
			defaults = {
				deviceType: "switchMultilevel",
				probeType: probeType,
				metrics: {
					icon: icon,
					isFailed: false
				}
			};

			if (!this.applyPostfix(defaults, changeVDev[changeDevId], nodeId, endpointId, title)) return;

			var vDev = this.controller.devices.create({
				deviceId: vDevId,
				defaults: defaults,
				overlay: {},
				handler: function(command, args) {
					var newVal = this.get('metrics:level');
					// up, down for Blinds
					if ("on" === command || "up" === command) {
						newVal = 255;
					} else if ("off" === command || "down" === command) {
						newVal = 0;
					} else if ("min" === command) {
						newVal = 10;
					} else if ("max" === command || "upMax" === command) {
						newVal = 255;
					} else if ("exact" === command || "exactSmooth" === command) {
						newVal = Math.round(parseInt(args.level, 10) * 255 / 99, 10);
						if (newVal < 0) {
							newVal = 0;
						} else if (newVal > 255) {
							newVal = 255;
						}
					} else if ("increase" === command) {
						cc.StepOnOff(0, 10);
						return;
					} else if ("decrease" === command) {
						cc.StepOnOff(1, 10);
						return;
					} else if ("stop" === command) { // Commands for Blinds
						cc.StopOnOff();
						return;
					} else if ("startUp" === command) {
						cc.MoveOnOff(0);
						return;
					} else if ("startDown" === command) {
						cc.MoveOnOff(1);
						return;
					} else if ("update" === command) {
						cc.Get();
						return;
					}

					if (0 === newVal || !!newVal) {
						if ("exactSmooth" === command)
							cc.MoveToLevelOnOff(newVal, args.duration);
						else
							cc.MoveToLevelOnOff(newVal);
					}
				},
				moduleId: self.id
			});

			if (vDev) {
				//TODO isFailed // vDev.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
				self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "currentLevel", function(type) {
					try {
						if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
							vDev.set("metrics:level", Math.round(this.value * 99 / 255, 10));
						}
					} catch (e) {}
				}, "value");
			}
		} else if (this.CC["ColorControl"] === clusterId) {
			var
				// TODO COLOR_SOFT_WHITE = 0,
				// TODO COLOR_COLD_WHITE = 1,
				COLOR_RED = 2,
				COLOR_GREEN = 3,
				COLOR_BLUE = 4;

			var ccLevelControl = endpoint.clusters[this.CC["LevelControl"]];
			if (!ccLevelControl) return;

			if (!self.controller.devices.get(vDevId + separ + "rgb")) {

				defaults = {
					deviceType: "switchRGBW",
					probeType: 'switchColor_rgb',
					metrics: {
						icon: 'multilevel',
						color: HSVtoRGB(
							cc.data.currentHue.value,
							cc.data.currentSaturation.value,
							ccLevelControl.data.currentLevel.value
						),
						level: 'off',
						oldColor: {},
						isFailed: false
					}
				}
				
				if (!this.applyPostfix(defaults, changeVDev[changeDevId], nodeId, endpointId, 'Color')) return;

				var vDev_rgb = this.controller.devices.create({
					deviceId: vDevId + separ + "rgb",
					defaults: defaults,
					overlay: {},
					handler: function(command, args) {
						var color = {
								r: 0,
								g: 0,
								b: 0
							},
							oldColor = vDev_rgb.get('metrics:oldColor');
						if (command === "on") {
							if (!_.isEmpty(oldColor)) {
								color = oldColor;
							} else {
								color.r = color.g = color.b = 255;
							}
						} else if (command === "off") {
							color.r = color.g = color.b = 0;
						} else if (command === "exact") {
							color.r = parseInt(args.red, 10);
							color.g = parseInt(args.green, 10);
							color.b = parseInt(args.blue, 10);
							vDev_rgb.set("metrics:oldColor", color);
						}
						
						var hsv = RGBtoHSV(color.r, color.g, color.b);
						
						console.logJS(hsv);
						cc.MoveToHueAndSaturation(hsv.h, hsv.s, 0);
						ccLevelControl.MoveToLevel(hsv.v);
					},
					moduleId: this.id
				});

				function HSVtoRGB(h, s, v) {
					var r, g, b, i, f, p, q, t;
					
					h = h / 255.0;
					s = s / 255.0;
					v = v / 255.0;
					
					i = Math.floor(h * 6);
					f = h * 6 - i;
					p = v * (1 - s);
					q = v * (1 - f * s);
					t = v * (1 - (1 - f) * s);
					
					switch (i % 6) {
						case 0: r = v, g = t, b = p; break;
						case 1: r = q, g = v, b = p; break;
						case 2: r = p, g = v, b = t; break;
						case 3: r = p, g = q, b = v; break;
						case 4: r = t, g = p, b = v; break;
						case 5: r = v, g = p, b = q; break;
					}
					
					return {
						r: Math.round(r * 255),
						g: Math.round(g * 255),
						b: Math.round(b * 255)
					};
				}
				
				function RGBtoHSV(r, g, b) {
					var max = Math.max(r, g, b), min = Math.min(r, g, b),
						d = max - min,
						h,
						s = (max === 0 ? 0 : d / max),
						v = max / 255;
					
					switch (max) {
						case min: h = 0; break;
						case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
						case g: h = (b - r) + d * 2; h /= 6 * d; break;
						case b: h = (r - g) + d * 4; h /= 6 * d; break;
					}
					
					return {
						h: Math.round(h * 255),
						s: Math.round(s * 255),
						v: Math.round(v * 255)
					};
				}
				
				function handleColor(type, arg) {
					try {
						var isOn = ccLevelControl.data.currentLevel.value > 0;

						if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
							self.controller.devices.remove(vDevId + separ + 'rgb');
						} else if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
							var color = HSVtoRGB(
								cc.data.currentHue.value,
								cc.data.currentSaturation.value,
								ccLevelControl.data.currentLevel.value
							);
							vDev_rgb.set("metrics:color", color);
							vDev_rgb.set("metrics:level", isOn ? "on" : "off");
						}
					} catch (e) {
						console.log(e.toString());
					}
				}

				if (vDev_rgb) {
					//TODO isFailed // vDev_rgb.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
					self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "currentHue", handleColor, "value");
					self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "currentSaturation", handleColor, "value");
					self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, this.CC["LevelControl"], "currentLevel", handleColor, "value");
				}
			}
		} /* else if (this.CC["SoundSwitch"] === clusterId) {
			if (cc.data) {
				// tones
				defaults = {
					deviceType: 'toggleButton',
					metrics: {
						icon: 'scene',
						level: 'on',
						title: '',
						isFailed: false
					}
				};
				
				for(var toneId = 0; toneId <= cc.data.tonesNumber.value; toneId++) {
					(function(toneId) {
						if ((toneId == 0 || cc.data[toneId]) && !self.controller.devices.get(vDevId + separ + toneId)) {
							var cVDId = changeDevId + separ + toneId;

							if (!self.applyPostfix(defaults, changeVDev[cVDId], nodeId, endpointId, toneId ? cc.data[toneId].toneName.value : 'Mute')) return;
							
							var vDev = self.controller.devices.create({
								deviceId: vDevId + separ + toneId,
								defaults: defaults,
								overlay: {},
								handler: function(command) {
									if (command === "on") {
										cc.TonePlaySet(toneId);
									}
								},
								moduleId: self.id
							});
							
							if (vDev) {
								//TODO isFailed // vDev.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
								self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, toneId + ".toneName", function(type) {
									try {
										if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
											self.controller.devices.remove(vDevId + separ + toneId);
										}
									} catch (e) {}
								}, "value");
								self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "tonesNumber", function(type) {
									try {
										if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
											self.controller.devices.remove(vDevId + separ + "0");
										}
									} catch (e) {}
								}, "value");
							}
						}
					})(toneId);
				}
				
				if (!this.controller.devices.get(vDevId)) {
					// volume
					defaults = {
						deviceType: "switchMultilevel",
						probeType: 'volume',
						metrics: {
							icon: 'multilevel',
							isFailed: false
						}
					};
					
					if (!this.applyPostfix(defaults, changeVDev[changeDevId], nodeId, endpointId, 'Volume')) return;

					var vDev = self.controller.devices.create({
						deviceId: vDevId,
						defaults: defaults,
						overlay: {},
						handler: function(command, args) {
							var newVal = this.get('metrics:level');
							if ("on" === command) {
								newVal = 255;
							} else if ("off" === command) {
								newVal = 0;
							} else if ("min" === command) {
								newVal = 10;
							} else if ("max" === command) {
								newVal = 99;
							} else if ("increase" === command) {
								newVal = newVal + 10;
								if (0 !== newVal % 10) {
									newVal = Math.round(newVal / 10) * 10;
								}
								if (newVal > 99) {
									newVal = 99;
								}
							} else if ("decrease" === command) {
								newVal = newVal - 10;
								if (newVal < 0) {
									newVal = 0;
								}
								if (0 !== newVal % 10) {
									newVal = Math.round(newVal / 10) * 10;
								}
							} else if ("exact" === command) {
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
							} else if ("update" === command) {
								cc.ConfigurationGet();
								return;
							}

							if (0 === newVal || !!newVal) {
								cc.ConfigurationSet(0, newVal);
							}
						},
						moduleId: self.id
					});

					if (vDev) {
						//TODO isFailed // vDev.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
						self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "defaultVolume", function(type) {
							try {
								if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
									vDev.set("metrics:level", this.value);
								}
							} catch (e) {}
						}, "value");
					}
				}
			}
		} else if (this.CC["SensorBinary"] === clusterId) {
			defaults = {
				deviceType: 'sensorBinary',
				probeType: '',
				metrics: {
					probeTitle: '',
					scaleTitle: '',
					icon: '',
					level: '',
					title: '',
					isFailed: false
				}
			};
			
			if (cc.data) {
				Object.keys(cc.data).forEach(function(sensorTypeId) {
					sensorTypeId = parseInt(sensorTypeId, 10);
					if (!isNaN(sensorTypeId) && !self.controller.devices.get(vDevId + separ + sensorTypeId)) {

						var cVDId = changeDevId + separ + sensorTypeId;
						
						defaults.metrics.probeTitle = cc.data[sensorTypeId].sensorTypeString.value;
						// aivs // Motion icon for Sensor Binary by default
						defaults.metrics.icon = "motion";
						defaults.probeType = "general_purpose";

						if (sensorTypeId === 2) {
							defaults.metrics.icon = "smoke";
							defaults.probeType = defaults.metrics.icon;
						} else if (sensorTypeId === 3 || sensorTypeId === 4) {
							defaults.metrics.icon = "co";
							defaults.probeType = defaults.metrics.icon;
						} else if (sensorTypeId === 6) {
							defaults.metrics.icon = "flood";
							defaults.probeType = defaults.metrics.icon;
						} else if (sensorTypeId === 7) {
							defaults.metrics.icon = "cooling";
							defaults.probeType = defaults.metrics.icon;
						} else if (sensorTypeId === 8) {
							defaults.metrics.icon = "tamper";
							defaults.probeType = defaults.metrics.icon;
						} else if (sensorTypeId === 10) {
							defaults.metrics.icon = "door";
							defaults.probeType = "door-window";
						} else if (sensorTypeId === 12) {
							defaults.metrics.icon = "motion";
							defaults.probeType = defaults.metrics.icon;
						}

						if (!self.applyPostfix(defaults, changeVDev[cVDId], nodeId, endpointId, 'Sensor', defaults.metrics.probeTitle)) return;

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
							if (changeVDev[cVDId] && changeVDev[cVDId].emulateOff) {
								vDev.__emulateOff_timeout = parseInt(changeVDev[cVDId].emulateOff, 10);
							}

							//TODO isFailed // vDev.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
							self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, sensorTypeId + ".level", function(type) {
								try {
									if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
										self.controller.devices.remove(vDevId + separ + sensorTypeId);
									} else {
										if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
											if (vDev.__emulateOff_timeout) {
												if (this.value) {
													if (vDev.get("metrics:level") !== "on" || !vDev.__emulateOff_timer) {
														vDev.set("metrics:level", "on");
													}
													vDev.__emulateOff_timer && clearTimeout(vDev.__emulateOff_timer);
													vDev.__emulateOff_timer = setTimeout(function() {
														vDev.set("metrics:level", "off");
														vDev.__emulateOff_timer = 0;
													}, vDev.__emulateOff_timeout);
												} // off from the sensor is ignored
											} else {
												vDev.set("metrics:level", this.value ? "on" : "off");
											}
										}
									}
								} catch (e) {}
							}, "value");

							if (changeVDev[cVDId] && changeVDev[cVDId].emulateOff) {
								// on start we need to kick the timer
								if (vDev.get("metrics:level") === "on") {
									self.zbee.devices[nodeId].endpoints[endpointId].clusters[clusterId].data[sensorTypeId].level.value = true;
								}
							}
						}
					}
				});
			}
			if (!scaleAdded) {
				self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "", function(type) {
					if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
						self.parseAddClusterClass(nodeId, endpointId, clusterId, true, changeVDev);
					}
				}, "child");
			}
		} else if (this.CC["SensorMultilevel"] === clusterId) {
			defaults = {
				deviceType: "sensorMultilevel",
				probeType: '',
				metrics: {
					probeTitle: '',
					scaleTitle: '',
					level: '',
					icon: '',
					title: '',
					isFailed: false
				}
			};
			
			if (cc.data) {
				Object.keys(cc.data).forEach(function(sensorTypeId) {

					sensorTypeId = parseInt(sensorTypeId, 10);
					if (!isNaN(sensorTypeId) && !self.controller.devices.get(vDevId + separ + sensorTypeId)) {

						var cVDId = changeDevId + separ + sensorTypeId;

						defaults.metrics.probeTitle = cc.data[sensorTypeId].sensorTypeString.value;
						defaults.metrics.scaleTitle = cc.data[sensorTypeId].scaleString.value;

						if (sensorTypeId === 1) {
							defaults.metrics.icon = "temperature";
						} else if (sensorTypeId === 3) {
							defaults.metrics.icon = "luminosity";
						} else if (sensorTypeId === 4 || sensorTypeId === 15 || sensorTypeId === 16) {
							defaults.metrics.icon = "energy";
						} else if (sensorTypeId === 5) {
							defaults.metrics.icon = "humidity";
						} else if (sensorTypeId === 9) {
							defaults.metrics.icon = "barometer";
						} else if (sensorTypeId === 12) {
							defaults.metrics.icon = "rain";
						} else if (sensorTypeId === 17) {
							defaults.metrics.icon = "co2";
						} else if (sensorTypeId === 25) {
							defaults.metrics.icon = "seismic";
						} else if (sensorTypeId === 27) {
							defaults.metrics.icon = "ultraviolet";
						} else if (sensorTypeId === 40) {
							defaults.metrics.icon = "co";
						} else if (sensorTypeId === 52) {
							defaults.metrics.icon = "acceleration_x";
						} else if (sensorTypeId === 53) {
							defaults.metrics.icon = "acceleration_y";
						} else if (sensorTypeId === 54) {
							defaults.metrics.icon = "acceleration_z";
						}

						defaults.probeType = defaults.metrics.icon;

						if (!self.applyPostfix(defaults, changeVDev[cVDId], nodeId, endpointId, 'Sensor', defaults.metrics.probeTitle)) return;

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
							//TODO isFailed // vDev.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
							self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, sensorTypeId + ".val", function(type) {
								try {
									if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
										self.controller.devices.remove(vDevId + separ + sensorTypeId);
									} else if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
										vDev.set("metrics:level", this.value);
									}
								} catch (e) {}
							}, "value");
						}
					}
				});
			}
			if (!scaleAdded) {
				self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "", function(type) {
					if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
						self.parseAddClusterClass(nodeId, endpointId, clusterId, true, changeVDev);
					}
				}, "child");
			}
		} else if (this.CC["Meter"] === clusterId) {
			defaults = {
				deviceType: 'sensorMultilevel',
				probeType: '',
				metrics: {
					probeTitle: '',
					scaleTitle: '',
					level: '',
					icon: 'meter',
					title: '',
					isFailed: false
				}
			};
			
			if (cc.data) {
				Object.keys(cc.data).forEach(function(scaleId) {

					scaleId = parseInt(scaleId, 10);
					if (!isNaN(scaleId) && !self.controller.devices.get(vDevId + separ + scaleId)) {
						var cVDId = changeDevId + separ + scaleId;
						
						defaults.metrics.probeTitle = cc.data[scaleId].sensorTypeString.value;
						defaults.metrics.scaleTitle = cc.data[scaleId].scaleString.value;

						// Check sensor type, can be: Electric, Gas, Water
						switch (cc.data[scaleId].sensorType.value) {
							// Electric meter
							case 1:
								switch (scaleId) {
									case 0:
										defaults.probeType = 'meterElectric_kilowatt_hour';
										break;
									case 1:
										defaults.probeType = 'meterElectric_kilovolt_ampere_hour';
										break;
									case 2:
										defaults.probeType = 'meterElectric_watt';
										break;
									case 3:
										defaults.probeType = 'meterElectric_pulse_count';
										break;
									case 4:
										defaults.probeType = 'meterElectric_voltage';
										break;
									case 5:
										defaults.probeType = 'meterElectric_ampere';
										break;
									case 6:
										defaults.probeType = 'meterElectric_power_factor';
										break;
									default:
										break;
								}
								break;
								// Gas meter
							case 2:
								switch (scaleId) {
									case 0:
										defaults.probeType = 'meterGas_cubic_meters';
										break;
									case 1:
										defaults.probeType = 'meterGas_cubic_feet';
										break;
									case 3:
										defaults.probeType = 'meterGas_pulse_count';
										break;
									default:
										break;
								}
								break;
								// Water meter
							case 3:
								switch (scaleId) {
									case 0:
										defaults.probeType = 'meterWater_cubic_meters';
										break;
									case 1:
										defaults.probeType = 'meterWater_cubic_feet';
										break;
									case 2:
										defaults.probeType = 'meterWater_us_gallons';
										break;
									case 3:
										defaults.probeType = 'meterWater_pulse_count';
										break;
									default:
										break;
								}
								break;
							default:
								break;
						}

						if (!self.applyPostfix(defaults, changeVDev[cVDId], nodeId, endpointId, 'Meter', defaults.metrics.probeTitle)) return;

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
							//TODO isFailed // vDev.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
							self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, scaleId + ".val", function(type) {
								try {
									if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
										self.controller.devices.remove(vDevId + separ + scaleId);
									} else if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
										vDev.set("metrics:level", this.value);
									}
								} catch (e) {}
							}, "value");
						}
					}
				});
			}
			if (!scaleAdded) {
				self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "", function(type) {
					if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
						self.parseAddClusterClass(nodeId, endpointId, clusterId, true, changeVDev);
					}
				}, "child");
			}
		} else if (this.CC["MeterPulse"] === clusterId) {
			defaults = {
				deviceType: 'sensorMultilevel',
				probeType: '',
				metrics: {
					probeTitle: 'meterElectric_pulse_count',
					scaleTitle: '',
					level: '',
					icon: 'meter',
					isFailed: false
				}
			};
			
			if (!this.controller.devices.get(vDevId)) {
				var cVDId = changeDevId;
				
				if (!this.applyPostfix(defaults, changeVDev[cVDId], nodeId, endpointId, 'Meter Pulse')) return;

				var vDev = this.controller.devices.create({
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
					//TODO isFailed // vDev.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
					self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "val", function(type) {
						try {
							if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
								self.controller.devices.remove(vDevId);
							} else if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
								vDev.set("metrics:level", this.value);
							}
						} catch (e) {}
					}, "value");
				}
			}
		} else if (this.CC["Battery"] === clusterId && !self.controller.devices.get(vDevId)) {

			defaults = {
				deviceType: 'battery',
				metrics: {
					probeTitle: 'Battery',
					scaleTitle: '%',
					level: '',
					icon: 'battery',
					isFailed: false
				}
			};
			
			if (!this.applyPostfix(defaults, changeVDev[changeDevId], nodeId, endpointId, 'Battery')) return;

			var vDev = this.controller.devices.create({
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
				//TODO isFailed // vDev.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
				self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "last", function(type) {
					try {
						if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
							vDev.set("metrics:level", this.value === 255 ? 0 : this.value);
						}
					} catch (e) {}
				}, "value");
			}
		}*/ else if (this.CC["DoorLock"] === clusterId) {
			defaults_lock = {
				deviceType: 'doorlock',
				metrics: {
					level: '',
					icon: 'lock',
					title: '',
					isFailed: false
				}
			};
			
			defaults_door = {
				deviceType: 'doorlock',
				metrics: {
					level: '',
					icon: 'lock',
					title: 'Door State',
					isFailed: false
				}
			};

			var lockType = cc.data.lockType.value;

			switch (lockType) {
				case 0x00:
					title = "Dead bolt";
					break;
				case 0x01:
					title = "Magnetic";
					break;
				case 0x02:
					title = "Other";
					break;
				case 0x03:
					title = "Mortise";
					break;
				case 0x04:
					title = "Rim";
					break;
				case 0x05:
					title = "Latch Bolt";
					break;
				case 0x06:
					title = "Cylindrical Lock";
					break;
				case 0x07:
					title = "Tubular Lock";
					break;
				case 0x08:
					title = "Interconnected";
					break;
				case 0x09:
					title = "Dead Latch";
					break;
				case 0x0A:
					title = "Door Furniture";
					break;
				default:
					title = "Door Lock"
					break;
			}

			if (!this.applyPostfix(defaults_lock, changeVDev[changeDevId], nodeId, endpointId, 'Door Lock', title)) return;
			if (!this.applyPostfix(defaults_door, changeVDev[changeDevId], nodeId, endpointId, 'Door Lock')) return;

			if (cc.data.lockState) {
				var vDev_lock = this.controller.devices.create({
					deviceId: vDevId + separ + "lock",
					defaults: defaults_lock,
					overlay: {},
					handler: function(command) {
						if ("open" === command) {
							cc.LockDoor("");
						} else if ("close" === command) {
							cc.UnlockDoor("");
						}
					},
					moduleId: self.id
				});
				
				if (cc.data.doorState) {
					var vDev_door = this.controller.devices.create({
						deviceId: vDevId + separ + "door",
						defaults: defaults_door,
						overlay: {},
						handler: function(command) {
							if ("open" === command) {
								cc.LockDoor("");
							} else if ("close" === command) {
								cc.UnlockDoor("");
							}
						},
						moduleId: self.id
					});

					if (vDev_door && vDev_lock) {
						vDev_door.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
						self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "doorState", function(type) {
							try {
								if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
									self.controller.devices.remove(vDevId);
								} else if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
									switch (this.value) {
										case 0x00:
											vDev_door.set("metrics:level", "open");
											vDev_lock.set("metrics:level", "open");
											break;
										case 0x01:
											vDev_door.set("metrics:level", "close");
											vDev_lock.set("metrics:level", "close");
											break;
										case 0x02:
											// TODO(Notifing  ERROR JAMMED)
											//vDev.set("metrics:level", "close");
											break;
										case 0x03:
											// TODO(Notifing  ERROR FORCED OPENED)
											vDev_door.set("metrics:level", "open");
											vDev_lock.set("metrics:level", "close");
											break;
										case 0x04:
											// TODO(Notifing  ERROR UNSPECIFIED)
											//vDev.set("metrics:level", "open");
											break;
										case 0xFF:
											// TODO(Notifing  UNDEFINED)
											//vDev.set("metrics:level", "open");
											break;
										default:
											break;
									}
								}
							} catch (e) {}
						}, "value");

						
						self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "lockState", function(type) {
							try {
								if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
									switch (this.value) {
										case 0x00:
											//TODO self.addNotification("error", "Not fully locked", "module");
											break;
										case 0x01:
											vDev_lock.set("metrics:level", "open");
											break;
										case 0x02:
											vDev_lock.set("metrics:level", "close");
										case 0xFF:
											//TODO self.addNotification("error", "Undefined lock state", "module");
											break;
										default:
											// TODO self.addNotification("error", "Unknown lock state", "module");
											break;
									}
								}
							} catch (e) {}
						}, "value");
					}
				}
				else {
					if (vDev_lock) {
						self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "lockState", function(type) {
							try {
								if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
									switch (this.value) {
										case 0x00:
											//TODO self.addNotification("error", "Not fully locked", "module");
											break;
										case 0x01:
											vDev_lock.set("metrics:level", "open");
											break;
										case 0x02:
											vDev_lock.set("metrics:level", "close");
										case 0xFF:
											//TODO self.addNotification("error", "Undefined lock state", "module");
											break;
										default:
											// TODO self.addNotification("error", "Unknown lock state", "module");
											break;
									}
								}
							} catch (e) {}
						}, "value");
					}
				}
			}
		} /*else if (this.CC["BarrierOperator"] === clusterId && !self.controller.devices.get(vDevId)) {

			defaults = {
				deviceType: 'doorlock',
				metrics: {
					level: '',
					icon: 'lock',
					isFailed: false
				}
			};
			
			if (!this.applyPostfix(defaults, changeVDev[changeDevId], nodeId, endpointId, 'Garage Door')) return;

			var vDev = self.controller.devices.create({
				deviceId: vDevId,
				defaults: defaults,
				overlay: {},
				handler: function(command) {
					if ("open" === command) {
						cc.Set(255);
					} else if ("close" === command) {
						cc.Set(0);
					}
				},
				moduleId: self.id
			});
			if (vDev) {
				//TODO isFailed // vDev.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
				self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "state", function(type) {
					try {
						if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
							vDev.set("metrics:level", this.value === 255 ? "open" : "close");
						}
					} catch (e) {}
				}, "value");
			}
		} else if (this.CC["ThermostatMode"] === clusterId || this.CC["ThermostatSetPoint"] === clusterId) {
			var
				withMode = in_array(endpointClusterClasses, this.CC["ThermostatMode"]) && endpoint.ThermostatMode.data.supported.value,
				withTemp = in_array(endpointClusterClasses, this.CC["ThermostatSetPoint"]) && endpoint.ThermostatSetPoint.data.supported.value,
				deviceNamePrefix = "ZBeeVDev_" + this.config.name + "_" + nodeId + separ + endpointId + separ;

			if ((withMode && !endpoint.ThermostatMode.data.interviewDone.value) || (withTemp && !endpoint.ThermostatSetPoint.data.interviewDone.value)) {
				return; // skip not finished interview
			}

			var MODE_OFF = 0,
				MODE_HEAT = 1,
				MODE_COOL = 2;

			// Handle Mode with proper changeVDev
			if (withMode && !self.controller.devices.get(deviceNamePrefix + this.CC["ThermostatMode"])) {
				var withModeOff = !!endpoint.ThermostatMode.data[MODE_OFF],
					withModeHeat = !!endpoint.ThermostatMode.data[MODE_HEAT],
					withModeCool = !!endpoint.ThermostatMode.data[MODE_COOL];

				if (withModeOff && (withModeHeat || withModeCool)) {

					defaults = {
						deviceType: "switchBinary",
						probeType: 'thermostat_mode',
						metrics: {
							icon: 'thermostat',
							isFailed: false
						}
					};
					
					if (!this.applyPostfix(defaults, changeVDev[changeDevId], nodeId, endpointId, 'Thermostat operation')) return;

					var m_vDev = this.controller.devices.create({
						deviceId: deviceNamePrefix + this.CC["ThermostatMode"],
						defaults: defaults,
						overlay: {},
						handler: function(command) {
							if ("on" === command) {
								var lastMode = withModeHeat ? MODE_HEAT : MODE_COOL;

								// modes are not always same in ThermostatSetPoint and in ThermostatMode, but here they are same
								if (withModeHeat && withModeCool && endpoint.ThermostatSetPoint && endpoint.ThermostatSetPoint.data[MODE_HEAT] && endpoint.ThermostatSetPoint.data[MODE_COOL]) {
									lastMode = endpoint.ThermostatSetPoint.data[MODE_HEAT].setVal.updateTime > endpoint.ThermostatSetPoint.data[MODE_COOL].setVal.updateTime ? MODE_HEAT : MODE_COOL;
								}
								endpoint.ThermostatMode.Set(lastMode);
							} else if ("off" === command) {
								endpoint.ThermostatMode.Set(MODE_OFF);
							}
						},
						moduleId: self.id
					});

					if (m_vDev) {
						//TODO isFailed // m_vDev.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
						self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, this.CC["ThermostatMode"], "mode", function(type) {
							try {
								if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
									m_vDev.set("metrics:level", this.value != MODE_OFF ? "on" : "off");
								}
							} catch (e) {}
						}, "value");
					}
				}
			}

			// Handle Set Point with proper changeVDev
			if (withTemp) {
				var withTempHeat = endpoint.ThermostatSetPoint.data[MODE_HEAT],
					withTempCool = endpoint.ThermostatSetPoint.data[MODE_COOL],
					modes = [];

				withTempHeat && modes.push(MODE_HEAT);
				withTempCool && modes.push(MODE_COOL);

				var t_vDev = [];
				modes.forEach(function(mode) {
					var cVDId = changeDevId + separ + mode;
					
					var DH = endpoint.ThermostatSetPoint.data[mode],
						_vDevId = deviceNamePrefix + self.CC["ThermostatSetPoint"] + "-" + mode;

					if (!self.controller.devices.get(_vDevId)) {

						defaults = {
							deviceType: "thermostat",
							probeType: 'thermostat_set_point',
							metrics: {
								scaleTitle: DH.scaleString.value,
								level: DH.val.value,
								min: DH.min && DH.min.value ? DH.min.value : (DH.scale.value === 0 ? 5 : 41),
								max: DH.max && DH.max.value ? DH.max.value : (DH.scale.value === 0 ? 40 : 104),
								icon: 'thermostat',
								isFailed: false
							}
						}
						
						if (!self.applyPostfix(defaults, changeVDev[cVDId], nodeId, endpointId, "Thermostat " + (mode === MODE_HEAT ? "Heat" : "Cool"))) return;

						t_vDev[mode] = self.controller.devices.create({
							deviceId: _vDevId,
							defaults: defaults,
							overlay: {},
							handler: function(command, args) {
								// first set the setpoint temperature and then apply the mode
								if (command === "exact") {
									endpoint.ThermostatSetPoint.Set(mode, args.level);
								}
								if (command === "on" || command === "exact") {
									endpoint.ThermostatMode && endpoint.ThermostatMode.data.supported.value && endpoint.ThermostatMode.Set(mode == MODE_HEAT ? MODE_HEAT : MODE_COOL); // modes are not always same in ThermostatSetPoint and in ThermostatMode, but here they are same
								}
								if (command === "update") {
									endpoint.ThermostatSetPoint.Get(mode);
									endpoint.ThermostatMode && endpoint.ThermostatMode.data.supported.value && endpoint.ThermostatMode.Get();
								}
							},
							moduleId: self.id
						});

						if (t_vDev[mode]) {
							//TODO isFailed // t_vDev[mode].set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
							self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, self.CC["ThermostatSetPoint"], mode + ".setVal", function(type) {
								try {
									if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
										delete t_vDev[mode];
										self.controller.devices.remove(_vDevId);
									} else if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
										t_vDev[mode].set("metrics:level", this.value);
									}
								} catch (e) {}
							});
						}
					}
				});
			}
		}
		*/

		else if (this.CC["OccupancySensing"] === clusterId) {
			defaults = {
				deviceType: 'sensorBinary',
				probeType: '',
				metrics: {
					level: 'off',
					title: '',
					isFailed: false
				}
			};
		
			var title = "Occupancy";
			
			if (!this.applyPostfix(defaults, changeVDev[changeDevId], nodeId, endpointId, 'Alarm', title)) return;

			
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
				//TODO isFailed a_vDev.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
				self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "zoneStatus", function(type) {
					try {
						if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
							self.controller.devices.remove(vDevId);
						} else if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
							vDev.set("metrics:level", this.value ? "on" : "off");
						}
					} catch (e) {}
				}, "value");
			}
		}
		else if (this.CC["IasZone"] === clusterId) {
			defaults = {
				deviceType: 'sensorBinary',
				probeType: '',
				metrics: {
					level: 'off',
					title: '',
					isFailed: false
				}
			};
			
			var zoneType = cc.data.zoneType.value;
			var zoneStatus = cc.data.zoneStatus.value;
			var title = "";
			
			switch (zoneType) {
				case 0x0000:
					defaults.metrics.icon = 'alarm';
					defaults.probeType = 'general_purpose';
					title = "";
					break;
				case 0x000d:
					defaults.metrics.icon = 'motion';
					defaults.probeType = 'motion';
					title = "Motion";
					break;
				case 0x0028:
					defaults.metrics.icon = 'smoke';
					defaults.probeType = 'smoke';
					title = "Smoke";
					break;
				case 0x002b:
					defaults.metrics.icon = 'co';
					defaults.probeType = 'co';
					title = "CO";
					break;
				case 0x002a:
					defaults.metrics.icon = 'alarm_flood';
					defaults.probeType = 'flood';
					title = "Flood";
					break;
				case 0x0015:
					defaults.metrics.icon = 'door';
					defaults.probeType = 'door';
					title = "Door";
					break;
				case 0x002d:
				case 0x0226:
					defaults.metrics.icon = 'burglar';
					defaults.probeType = 'burglar';
					title = "Burglar";
					break;
				case 0x002c:
				case 0x0225:
					defaults.metrics.icon = 'alarm';
					defaults.probeType = 'emergency';
					title = "Emergency";
					break;
				default:
					defaults.metrics.icon = 'alarm';
					defaults.probeType = 'general_purpose';
					title = "";
					break;
			}
			
			if (!this.applyPostfix(defaults, changeVDev[changeDevId], nodeId, endpointId, 'Alarm', title)) return;

			
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
				//TODO isFailed a_vDev.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
				self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, "zoneStatus", function(type) {
					try {
						if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
							self.controller.devices.remove(vDevId);
						} else if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
							vDev.set("metrics:level", (this.value & 0x01) ? "on" : "off");
						}
					} catch (e) {}
				}, "value");
			}
		}
		/*
		else if (this.CC["Configuration"] === clusterId) {
			if (changeVDev[changeDevId]) {
				Object.keys(changeVDev[changeDevId]['configVDev']).forEach(function(param) {
					var vDevIdParam = vDevId + '-' + param,
					vDevConfig = changeVDev[changeDevId]['configVDev'][param];
					
					if (!self.controller.devices.get(vDevIdParam)) {
						var icon, probeType;
						
						if (vDevConfig.type == "switchBinary") {
							defaults = {
								deviceType: "switchBinary",
								probeType: "switch",
								metrics: {
									title: vDevConfig.title,
									icon: "switch",
									isFailed: false
								}
							};
						} else if (vDevConfig.type == "switchMultilevel") {
							defaults = {
								deviceType: "switchMultilevel",
								probeType: "multilevel",
								metrics: {
									title: vDevConfig.title,
									icon: "multilevel",
									isFailed: false
								}
							};
						} else {
							self.addNotification("error", "Unknown vDev type for config parameter " + param, "module");
							return;
						}
						
						eval('vDevConfig.v2p_script = function(command, args, vdev) { "use strict";' + vDevConfig.v2p + '};');
						eval('vDevConfig.p2v_script = function(value) { "use strict";' + vDevConfig.p2v + '};');
						
						if (!cc.data[param] || !cc.data[param].size.value) { // make sure the size of the parameter is known, so Set works
							cc.Get(param);
						}

						var vDev = self.controller.devices.create({
							deviceId: vDevIdParam,
							defaults: defaults,
							overlay: {},
							handler: function(command, args) {
								if ("update" === command || !cc.data[param] || !cc.data[param].size.value) { // make sure the size of the parameter is known, so Set works
									cc.Get(param);
								} else {
									var val = vDevConfig.v2p_script(command, args, vDev);
									if (val !== null && val !== undefined) {
										cc.Set(param, val);
									}
								}
							},
							moduleId: self.id
						});
						
						if (vDev) {
							//TODO isFailed // vDev.set('metrics:isFailed', self.zbee.devices[nodeId].data.isFailed.value);
							self.dataBind(self.gateDataBinding, self.zbee, nodeId, endpointId, clusterId, param + ".val", function(type) {
								try {
									if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
										self.controller.devices.remove(vDevIdParam);
									} else if (!(type & self.ZWAY_DATA_CHANGE_TYPE["Invalidated"])) {
										vDev.set("metrics:level", vDevConfig.p2v_script(this.value));
									}
								} catch (e) {}
							}, "value");
						}
					}
				});
			}
		}
		*/
	} catch (e) {
		var langFile = this.loadModuleLang(),
			values = nodeId + "-" + endpointId + "-" + clusterId + ": " + e.toString();

		this.addNotification("error", langFile.err_dev_create + values, "core");
		console.log(e.stack);
	}
};

Zigbee.prototype.parseDelClusterClass = function(nodeId, endpointId, clusterId) {
	nodeId = parseInt(nodeId, 10);
	endpointId = parseInt(endpointId, 10);
	clusterId = parseInt(clusterId, 10);

	var self = this,
		separ = "-",
		vDevIdPrefix = "ZBeeVDev_" + this.config.name + "_",
		vDevIdNI = nodeId + separ + endpointId,
		vDevIdC = clusterId,
		vDevId = vDevIdPrefix + vDevIdNI + separ + vDevIdC;

	this.controller.devices.remove(vDevId);
};

Zigbee.prototype.nodeNameByType = function (nodeId, nodeData) {

	var name = 'Device ' + nodeId,
		type = '',
		node = nodeData;

	if (node){
		var isSleepy = false; // TODO wait for isSleepy to be moved on device // node.isSleepy.value;

		if (isSleepy) {
			type = 'Battery';
		} else {
			type = 'Mains';
		}
		name = type + name;
	}

	return name;
};
