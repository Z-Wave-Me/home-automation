/*** Z-Wave Binding module ********************************************************

Version: 2.1.3
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
		"CentralScene": 0x5b,
		"Battery": 0x80,
		"DeviceResetLocally": 0x5a,
		"BarrierOperator": 0x66
	};

	this.default_expert_config = {
		'debug' : false
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
// ws.allowExternalAccess("ZWave.list",  config.publicAPI ? controller.auth.ROLE.ANONYMOUS : controller.auth.ROLE.ADMIN);

ZWave.prototype.updateList = function() {
	this.controller.setNamespace("zways", this.controller.namespaces, ZWave.list().map(function(name) { return {zwayName: name}; }));
};

ZWave.prototype.init = function (config) {
	ZWave.super_.prototype.init.call(this, config);

	var self = this;

	// select the latest updated postfix.json
	this.postfix = this.loadModuleJSON("postfix.json");
	updatedPostfix = loadObject("postfix.json");

	if (!!updatedPostfix && updatedPostfix.last_update && this.postfix.last_update && updatedPostfix.last_update > this.postfix.last_update) {
		this.postfix = updatedPostfix; 
	}

	this.expert_config = loadObject("expertconfig.json");

	if(!!!this.expert_config) {
		this.expert_config = self.default_expert_config;
		saveObject("expertconfig.json", this.expert_config);
	}

	this.cmdClasses = this.loadModuleJSON("cmd_classes.json");

	this.ipacket = [];
	this.opacket = [];

	// select custompostfix.json
	custom_postfix = loadObject("custompostfix.json");

    // add custom_postfix to postfix
	if(!!custom_postfix) {
        custom_fixes = custom_postfix.fixes;
        pfixes = this.postfix.fixes;

        for(var x in custom_fixes) {
            var z = 0;
            for(var y in pfixes) {
                if(custom_fixes[x].p_id === pfixes[y].p_id) {
                    custom_fixes[x].id = pfixes[y].id;
                    pfixes[y] = _.assign(pfixes[y], custom_fixes[x]);
                    break;
                }
                z++;
            }

            if(z == pfixes.length) {
                var id = Math.max.apply(Math, pfixes.map(function(fix) {
                    return fix.id;
                }));
                custom_fixes[x].id = (id +1);
                pfixes.push(custom_fixes[x]);
            }
        }

		this.postfix.fixes = pfixes;
	}

	this.startBinding();
	if (!this.zway) {
		return;
	}
	
	this.CommunicationLogger();

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
	var self = this;

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
		var moduleName = this.getName(),
		    langFile = self.controller.loadModuleLang(moduleName);
		
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
	this.updateList();

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

	clearInterval(this.timer);

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
		this.updateList();
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
			// retry open after 10 seconds
			console.log("Restarting Z-Wave binding");
			self.startBinding();
		}, 10000);
	}
};

ZWave.prototype.CommunicationLogger = function() {

	var self = this,
		zway = this.zway,
		ipacket = this.ipacket,
		opacket = this.opacket;

	avg = function(arr) { var ret = arr.reduce(function(a, b) { return a + b; }, 0); return ret/arr.length; };
	stddev = function(arr) { var _avg = avg(arr); ret = arr.reduce(function(p, c) { return p + (c-_avg)*(c-_avg); }, 0); return Math.sqrt(ret)/arr.length; };
	uniq = function(arr) { return arr.filter(function(value, index, self) { return self.indexOf(value) === index; }); };
	group = function(arr) { var ret = {}; arr.map(function(x) { if (ret[x]) ret[x]++; else ret[x] = 1; }); return ret; };

	inH = function () {

		var _ipacket = loadObject("incomingPacket.json");

		if(_ipacket === null) {
			_ipacket = [];
		}

		console.log(JSON.stringify(this));

		if(ipacket.length > 4000) { ipacket = [];}

		ipacket.push(this);
		_ipacket.push(this);

		/*
		inNodes = uniq(ipacket.map(function(x) { return x.value[3] }));

		for (indx in inNodes) {
			var id = inNodes[indx];
			var rssis = data.filter(function(x) {
				return x.value[3] == id && x.RSSI;
			}).map(function(x) {
				return x.RSSI.value;
			});
			console.log("homeid: "+id, "avg rssi: "+avg(rssis), stddev(rssis), "rssi length: "+rssis.length);
		};*/

		saveObject("incomingPacket.json", _ipacket);
	};

	zway.controller.data.incomingPacket.bind(inH);

	outH = function () {

		var _opacket = loadObject("outgoingPacket.json");

		if(_opacket === null) {
			_opacket = [];
		}

		console.log(JSON.stringify(this));

		if(opacket.length > 4000) { opacket = [];}

		opacket.push(this);
		_opacket.push(this);

		/*
		outNodes = uniq(opacket.filter(function(x) { return x.nodeId }).map(function(x) { return x.nodeId.value }));

		console.log("id PER delivery time, RSSI, hops");
		for (indx in outNodes) {
			var id = outNodes[indx];

			var delivered = opacket.filter(function(x) {
				return x.nodeId && x.nodeId.value == id && x.delivered;
			}).map(function(x) {
				return x.delivered.value * 100;
			});

			var deliveryTime = opacket.filter(function(x) {
				return x.nodeId && x.nodeId.value == id && x.delivered;
			}).map(function(x) {
				return x.deliveryTime.value;
			});

			var rssis = opacket.filter(function(x) {
				return x.nodeId && x.nodeId.value == id && x.returnRSSI
			}).map(function(x) {
				return x.returnRSSI.value[0];
			});

			var hops = opacket.filter(function(x) {
				return x.nodeId && x.nodeId.value == id && x.returnRSSI;
			}).map(function(x) {
				return x.hops.value.length;
			});

			console.log("homeid: "+id, "delivered: "+avg(delivered).toFixed(2), "deliveryTime: "+avg(deliveryTime).toFixed(2), "delivered: "+stddev(deliveryTime).toFixed(2), "avg rssi: "+avg(rssis).toFixed(2), stddev(rssis).toFixed(2), "avg hops: "+avg(hops).toFixed(2));
		};
		*/
		saveObject("outgoingPacket.json", _opacket);
	};

	zway.controller.data.outgoingPacket.bind(outH);

	/*
	rssiH = function() {
		var data = loadObject("rssidata.json");

		if(!data) data = [];
		var rssi = zway.controller.data.statistics.backgroundRSSI;

		var d = {
			"time": rssi.updateTime,
			"channel1": rssi.channel1.value,
			"channel2": rssi.channel2.value,
			"channel3": rssi.channel3.value
		};

		data.push(d);
		saveObject("rssidata.json", data);
	}

	zway.controller.data.statistics.backgroundRSSI.bind(rssiH);
	*/

	this.timer = setInterval(function() {
		var data = loadObject("rssidata.json");

		if(!data) data = [];
		zway.GetBackgroundRSSI();

		var rssi = zway.controller.data.statistics.backgroundRSSI;

		var d = {
			"time": rssi.updateTime,
			"channel1": rssi.channel1.value,
			"channel2": rssi.channel2.value,
			"channel3": rssi.channel3.value
		};

		data.push(d);
		saveObject("rssidata.json", data);
	}, 1000*60);
};


// --------------- Public HTTP API -------------------


ZWave.prototype.externalAPIAllow = function (name) {
	var _name = !!name ? ("ZWave." + name) : "ZWaveAPI";

	ws.allowExternalAccess(_name, this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".list",  this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".Run", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".Data", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".InspectQueue", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".Backup", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".Restore", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".CreateZDDX", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".CommunicationStatistics", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".CommunicationHistory", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".FirmwareUpdate", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".ZMELicense", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".ZMEFirmwareUpgrade", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".ZMEBootloaderUpgrade", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".PostfixUpdate", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".Postfix", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".PostfixAdd", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
    ws.allowExternalAccess(_name + ".PostfixGet", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
    ws.allowExternalAccess(_name + ".PostfixRemove", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".ExpertConfigGet", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".ExpertConfigUpdate", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
	// -- see below -- // ws.allowExternalAccess(_name + ".JSONtoXML", this.config.publicAPI ? this.controller.auth.ROLE.ANONYMOUS : this.controller.auth.ROLE.ADMIN);
};

ZWave.prototype.externalAPIRevoke = function (name) {
	var _name = !!name ? ("ZWave." + name) : "ZWaveAPI";

	ws.revokeExternalAccess(_name);
	ws.revokeExternalAccess(_name + ".list");
	ws.revokeExternalAccess(_name + ".Run");
	ws.revokeExternalAccess(_name + ".Data");
	ws.revokeExternalAccess(_name + ".InspectQueue");
	ws.revokeExternalAccess(_name + ".Backup");
	ws.revokeExternalAccess(_name + ".Restore");
	ws.revokeExternalAccess(_name + ".CreateZDDX");
	ws.revokeExternalAccess(_name + ".CommunicationStatistics");
	ws.revokeExternalAccess(_name + ".CommunicationHistory");
	ws.revokeExternalAccess(_name + ".FirmwareUpdate");
	ws.revokeExternalAccess(_name + ".ZMELicense");
	ws.revokeExternalAccess(_name + ".ZMEFirmwareUpgrade");
	ws.revokeExternalAccess(_name + ".ZMEBootloaderUpgrade");
	ws.revokeExternalAccess(_name + ".PostfixUpdate");
	ws.revokeExternalAccess(_name + ".Postfix");
	ws.revokeExternalAccess(_name + ".PostfixAdd");
    ws.revokeExternalAccess(_name + ".PostfixGet");
    ws.revokeExternalAccess(_name + ".PostfixRemove");
	ws.revokeExternalAccess(_name + ".ExpertConfigGet");
	ws.revokeExternalAccess(_name + ".ExpertConfigUpdate");
	// -- see below -- // ws.revokeExternalAccess(_name + ".JSONtoXML");
};

ZWave.prototype.defineHandlers = function () {
	var zway = this.zway;
	var postfix = this.postfix;
	var expert_config = this.expert_config;
	var self = this;

	var cmdClasses = this.cmdClasses;

	this.ZWaveAPI = function() {
		return { status: 400, body: "Bad ZWaveAPI request " };
	};

	this.ZWaveAPI.list = function() {
		try {
			var zwayList = ZWave.list() || [];

			/* TODO: search for remote IP adresses
			if (this.config.publicAPI && zwayList.length > 0) {
				_.forEach(zwayList, function(zwayName, index){
					http.request({
						method: "POST",
						url: data.url,
						contentType: "application/json",
						async: true,
						success: function (res) {
							// do nothing
						},
						error: function (res) {
							// remove from list
							zwayList = zwayList.splice(index, 1);
						}
					});
				});
			}
			console.log("zwayList:", JSON.stringify(zwayList));
			*/
			return zwayList;
		} catch (e) {
			return { status: 500, body: e.toString() };
		}
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
		if (!this.zway || !this.zwayBinding || !this.zway.devices[nodeId] || this.devicesBindings[nodeId] || !this.zway.devices[nodeId].data.lastPacketInfo) {
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

	// attach packetlog handler. on Z-Way binding stop it will be released itself, no need to write stop code
	if (zway.controller && zway.controller.data && zway.controller.data.incomingPacket) {
		zway.controller.data.incomingPacket.bind(function() {
			ws.push({
				type: 'me.z-wave.namespaces.z-wave.packetLog',
				data: this.value
			});
		});
	};

	this.ZWaveAPI.CommunicationHistory = function(url, request) {
		self = this,
			   cmdClass = cmdClasses.zw_classes.cmd_class,
			   packets = [],
			   nodeid = zway.controller.data.nodeId.value,
			   body = {
					"code": 200,
					"message": "200 OK",
				    "updateTime": null,
					"data": []
			   }

		var timestamp = parseInt(url.substring(1), 10) || 0;

		if (request.query) {
			var filterObj = JSON.parse(request.query.filter);
		}  else {
			var filterObj = null;
		}

		var ipacket = loadObject("incomingPacket.json");

		if(!_.isNull(ipacket)) {
			ipacket.forEach(function (packet) {
				var exist = _.find(packets, function(p){
					if(p.updateTime === packet.updateTime && p.type === 'incoming') {
						if(_.isArray(p.value) && _.isArray(packet.value)) {
							if(_.isEqual(p.value, packet.value)) {
								return p;
							}
						}
					}
				});

				if(typeof exist === 'undefined') {
					packets.push(
						{
							type: 'incoming',
							updateTime: packet.updateTime,
							value: packet.value,
							src: (_.isArray(packet.value)) ? packet.value[3] : "",
							dest: nodeid,
							data: (_.isArray(packet.value)) ? setZnifferDataType(packet.value[2]) : "",
							application: (_.isArray(packet.value)) ? packetApplication(packet.value) : ""
						}
					);
				}
			});
		}


		var opacket = loadObject("outgoingPacket.json");

		if(!_.isNull(opacket)) {
			opacket.forEach(function (packet) {
				var exist = _.find(packets, function(p){
					if(p.updateTime === packet.updateTime && p.type === 'outgoing') {
						if(_.isArray(p.value) && _.isArray(packet.value)) {
							if(_.isEqual(p.value, packet.value)) {
								return p;
							}
						}
					}
				});

				if(typeof exist === 'undefined') {
					packets.push(
						{
							type: 'outgoing',
							updateTime: packet.updateTime,
							value: packet.value,
							src: nodeid,
							dest: (_.isArray(packet.value)) ? packet.value[3] : "",
							data: (_.isArray(packet.value)) ? setZnifferDataType(packet.value[2]) : "",
							application: (_.isArray(packet.value)) ? packetApplication(packet.value) : ""
						}
					);
				}
			});
		}


		function packetApplication(packet) {
			var cmdClassKey = decToHex(packet[5], 2, '0x');

			var cmdKey = decToHex(packet[6], 2, '0x')

			var ret = {};

			var findCmdClass = _.where(cmdClass, {_key: cmdClassKey});

			if (!findCmdClass) {
				return;
			}

			var _cmdClass = findCmdClass.pop();

			if(_.isEmpty(_cmdClass)) {
				return;
			}

			if (_.isArray(_cmdClass.cmd)) {
				ret = _.findWhere(_cmdClass.cmd, {_key: cmdKey});
			} else {
				ret = _cmdClass.cmd;
			}
			if(typeof ret === "object") {
				if(ret.hasOwnProperty('_help')) {
					ret = ret._help;
				} else {
					ret = "";
				}
			} else {
				ret = "";
			}

			return ret;
		}

		function decToHex(decimal, chars, x) {
			var hex = (decimal + Math.pow(16, chars)).toString(16).slice(-chars).toUpperCase();
			return (x || '') + hex;
		};

		function setZnifferDataType(data) {
			switch (data) {
				case 0:
					return 'Singlecast';
				case 255:
					return 'Predicast';
				default:
					return 'Multicast';
			}
		};


		if(!_.isEmpty(packets)) {

			body.updateTime = _.max(packets, function (v) {
				return v.updateTime;
			}).updateTime;

			packets = packets.filter(function(p) {
				return p.updateTime >= timestamp;
			});

			if(!_.isNull(filterObj)) {

				if (filterObj.src.value != "") {
					filter = packets.filter(function (p) {
						if(parseInt(filterObj.src.show) === 1) {
							return p.src == filterObj.src.value;
						} else {
							return p.src != filterObj.src.value;
						}

					});
					packets = filter;
				}

				if (filterObj.dest.value != "") {
					filter = packets.filter(function (p) {
						if(parseInt(filterObj.dest.show) === 1) {
							return p.dest == filterObj.dest.value;
						} else {
							return p.dest != filterObj.dest.value;
						}

					});
					packets = filter;
				}

				if(filterObj.data.value != "") {
					filter = packets.filter(function(p) {
						if(parseInt(filterObj.data.show) === 1) {
							return p.data == filterObj.data.value;
						} else {
							return p.data != filterObj.data.value;
						}

					});
					packets = filter;
				}
			}

			packets = _.sortBy(packets, function(a,b) {
				return b.updateTime - a.updateTime;
			});
		}


		body.data = packets;

		return {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Connection": "keep-alive"
			},
			body: body
		};
	};

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

	this.ZWaveAPI.Postfix = function(url, request) {		
		
		var show = request.query ? request.query : null;

		if (!!postfix) {

			pfix = postfix;

			if (show === 'false') {
				pfix = postfix.fixes? postfix.fixes : postfix;

				pfix = pfix.map(function (fix) { 
						return { p_id: fix.p_id, product: fix.product }
					});
			}
		
			return {
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Connection": "keep-alive"
				},
				body: pfix
			};
		} else {
			return {
				status: 500,
				body: 'Cannot load postfix.'
			};

		}
	};

	this.ZWaveAPI.PostfixUpdate = function(url, request) {
		var self = this,
			success,
			delay = (new Date()).valueOf() + 10000; // wait not more than 10 seconds

		// update postfix JSON
		http.request({
			url: "http://zwave.dyndns.org:8088/ext_functions/support/dump/postfix.json",
		   	async: true,
			success: function(res) {
				if (res.data && res.data.fixes && res.data.fixes.length > 0 && res.data.last_update && res.data.last_update > postfix.last_update) {
					saveObject('postfix.json', res.data);
					success = 1;
				} else {
					success = 2;
				}
			},
			error: function() {
				console.log('Error has occured during updating the fixes list');
				success = 0;
			}
		});
		
		while (!success && (new Date()).valueOf() < delay) {
			processPendingCallbacks();
		}

		switch(success) {
		   	case 1:
			   	setTimeout(function () {
					self.controller.reinitializeModule('ZWave', 'modules/');
				}, 3000);
					
				return {
					status: 200,
					body: 'ZWave will be reinitialized in 3, 2, 1 ... \nReload the page after 15-20 sec to check if fixes are up to date.'
				};
			case 2: 
				return {
					status: 200,
					body: 'List of fixes is already up to date ... '
				};
			default:
				return {
					status: 500,
					body: 'Something went wrong ... '
				};
		}
	};

	this.ZWaveAPI.PostfixGet = function(url) {
        var p_id = url.substring(1),
            fixes = postfix.fixes,
            fix = fixes.filter(function (fix) {
                return fix.p_id === p_id;
            });

        if (!_.isEmpty(fix)) {
            return {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Connection": "keep-alive"
                },
                body: fix[0]
            };
        } else {
            return {status: 404, body: "Postfix with p_id: " + p_id + " not found"};
        }
    };

	this.ZWaveAPI.PostfixAdd = function(url, request) {

		if(request.method === "POST" && request.body) {

			var date = new Date(),
				reqObj = typeof request.body === "string" ? JSON.parse(request.body) : request.body;

            var custom_postfix = loadObject("custompostfix.json");

			if(custom_postfix === null) {

				reqObj.id = 1;

				custom_postfix = {
					"last_update" : Math.floor(date.getTime()/1000),
					"fixes" : [reqObj]
				};

			} else {

				var fixes = custom_postfix.fixes,
					fix = fixes.filter(function(fix) {
						return fix.p_id === reqObj.p_id;
					});

				if(_.isEmpty(fix)) {
					var id = Math.max.apply(Math, custom_postfix.fixes.map(function(fix) {
						return fix.id;
					}));
					reqObj.id = id+1;

					custom_postfix.fixes.push(reqObj);

				} else {

					var tempFixes = fixes;

					for(var p in tempFixes) {
						if(tempFixes[p].p_id === reqObj.p_id) {
							tempFixes[p] = _.assign(tempFixes[p], reqObj);
						}
					}

					custom_postfix.fixes = tempFixes;
				}

				custom_postfix.last_update = Math.floor(date.getTime()/1000);

			}

			saveObject("custompostfix.json", custom_postfix);

			setTimeout(function () {
				self.controller.reinitializeModule('ZWave', 'modules/');
			}, 3000);

			return {
				status: 200,
				body: 'ZWave will be reinitialized in 3, 2, 1 ... \nReload the page after 15-20 sec to check if fixes are up to date.'
			};

		}
		return { status: 400, body: "Invalid request" };
	};

    this.ZWaveAPI.PostfixRemove = function(url, request) {
        if(request.method === "POST" && request.body) {
            var custom_postfix = loadObject("custompostfix.json"),
                reqObj = typeof request.body === "string" ? JSON.parse(request.body) : request.body;

            if(!!custom_postfix) {

                var fixes = custom_postfix.fixes,
                    fix = fixes.filter(function(fix) {
                        return fix.p_id === reqObj.p_id;
                    });

                if(!_.isEmpty(fix)) {
                    fixes = _.reject(fixes ,function(fix) {
                        return fix.p_id === reqObj.p_id;
                    });

                    custom_postfix.fixes = fixes;

                    saveObject("custompostfix.json", custom_postfix);

                    setTimeout(function () {
                        self.controller.reinitializeModule('ZWave', 'modules/');
                    }, 3000);

                    return {
                        status: 200,
                        body: 'Postfix with p_id: ' + reqObj.p_id + ' removed.\nZWave will be reinitialized in 3, 2, 1 ... \nReload the page after 15-20 sec to check if fixes are up to date.'
                    };

                } else {
                    return {
                        status: 404,
                        body: 'Postfix with p_id: ' + reqObj.p_id + ' not found or already deleted'
                    };
                }
            } else {
                return {
                    status: 404,
                    body: 'Custompostfix does not yet exit'
                };
            }
        }
        return { status: 400, body: "Invalid request" };
    };

    this.ZWaveAPI.ExpertConfigGet = function() {
		return {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Connection": "close"
			},
			body: expert_config
		};
	};

	this.ZWaveAPI.ExpertConfigUpdate = function(url, request) {
		var self = this,
			reqObj;

		if (request.method === "POST" && request.body) {
			reqObj = typeof request.body === "string" ? JSON.parse(request.body) : request.body;

			if(Object.keys(reqObj).length = 1) {
				var keys = Object.keys(reqObj);

				if(expert_config.hasOwnProperty(keys[0])) {
					_.assign(expert_config, reqObj);

					saveObject("expertconfig.json", expert_config);
					return {
						status: 200,
						body: "Done"
					};

				} else {
					return { status: 404, body: "Property " + keys[0] + " not found" };
				}
			}
			//TODO multiple property update
			/*
			 for( key in keys) {
			 if(expert_config.hasOwnProperty(keys[key])) {
			 expert_config[keys[key]] = reqObj[keys[key]];
			 }
			 }*/
		}
		return { status: 400, body: "Invalid request" };
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
	// three prototypes:
	//  (dataBindings, zway, nodeId, instanceId, commandClassId, path, func, type)
	//  (dataBindings, zway, nodeId,                             path, func)
	//  (dataBindings, zway,                                     path, func) // bind to controller data

	var pathArr = [],
		data = null,
		ctrlBind = is_function(instanceId),
		devBind = is_function(commandClassId);

	if (ctrlBind) {
		path = nodeId;
		func = instanceId;
		nodeId = undefined;
		instanceId = undefined;
		commandClassId = undefined;
		data = zway.controller.data;
	} else if (devBind) {
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
		if (ctrlBind) {
			dataBindings.push({
				"zway": zway,
				"path": path,
				"func": data.bind(func, false)
			});
		} else if (devBind) {
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
		var ctrlBind = ! ("nodeId" in item),
		    devBind = ! ("instanceId" in item);

		if (item.zway && item.zway.isRunning() && (ctrlBind || (item.zway.devices[item.nodeId] && (devBind || (item.zway.devices[item.nodeId].instances[item.instanceId] && item.zway.devices[item.nodeId].instances[item.instanceId].commandClasses[item.commandClassId]))))) {
			var data = ctrlBind ? item.zway.controller.data : (devBind ? item.zway.devices[item.nodeId].data : item.zway.devices[item.nodeId].instances[item.instanceId].commandClasses[item.commandClassId].data),
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
	    moduleName = this.getName(),
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

	var self = this,
		fixesDone = [];

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
						changeVDev = {},
						deviceData = self.zway.devices[nodeId].data,
						deviceInstances = self.zway.devices[nodeId].instances,
						deviceCC = deviceInstances[instanceId].commandClasses[commandClassId],
						c = self.zway.controller,
						mId = deviceData.manufacturerId.value? deviceData.manufacturerId.value : null,
						mPT = deviceData.manufacturerProductType.value? deviceData.manufacturerProductType.value : null,
						mPId = deviceData.manufacturerProductId.value? deviceData.manufacturerProductId.value: null,
						appMajor = deviceData.applicationMajor.value? deviceData.applicationMajor.value: null,
						appMinor = deviceData.applicationMinor.value? deviceData.applicationMinor.value: null,
						devId,
						postFix,
						fixes = self.postfix.fixes? self.postfix.fixes : self.postfix;					
					
					// try to get fix by manufacturerProductId and application Version
					if (!!mId && !!mPT && !!mPId && !!self.postfix) {

						devId = mId + '.' + mPT + '.' + mPId,
						appMajorId = devId + '.' + appMajor,
						appMajorMinorId = devId + '.' + appMajor + '.' + appMinor,
						postFix = fixes.filter(function(fix) {
							return 	fix.p_id === devId || 		//search by manufacturerProductId
									fix.p_id === appMajorId || //search by applicationMajor
									fix.p_id === appMajorMinorId; 	//search by applicationMajor and applicationMinor
						});
					}

					// ----------------------------------------------------------------------------
					// --- postfix functions
					// ----------------------------------------------------------------------------
					
					// add SwitchController support by entering (runs once after inclusion):
					// instId ... instance ID
					// commandClass ... Command Class ID
					// maxBtnNr ... maximum number of widgets that should / could be rendered
					// type ... 'S' for 'scene' and 'B' for 'button' or 'switchControl'
					function sceneSupport (instId, commandClass, maxBtnNr, type) {
						var trapArray = [],
							commandClass = commandClass || null;
						
						trapArray = self.controller.instances.filter(function (instance) {
								return instance.moduleId === 'SwitchControlGenerator';
							});
						if (instId === instanceId && commandClassId === commandClass && deviceCC && c.data.lastIncludedDevice.value === nodeId) {
							maxBtnNr = (deviceCC.data.maxScenes.value && deviceCC.data.maxScenes.value <= maxBtnNr? deviceCC.data.maxScenes.value : maxBtnNr) || 0
							
							if (trapArray[0].params.generated.indexOf('ZWayVDev_zway_Remote_' + nodeId + '-' + instanceId + '-0-1') === -1) {
								for (i = 1; i <= maxBtnNr; i++) {
									this.controller.emit('SwitchControlGenerator.register', self.config.name, nodeId, instanceId, '0', i, type);

									// console output
									console.log('#######################', 'ADD SWITCHCONTROLGENERATOR SUPPORT TO #'+ nodeId,'###############################');
									console.log('###');
									console.log('###', 'Add support for instance ' + instId + ':');
									console.log('###', 'CC:', commandClass);
									console.log('###', 'Set maximum number of buttons / secnes to :', maxBtnNr);
									console.log('###', 'Add virtual devices as type button (B) or scene (S):', type);
									console.log('###');
									console.log('############################################################################################################');
								}
							}
						}
					}

					// set device config by entering (runs once after inclusion):
					// instId ... instance ID
					// parameter ... id of the parameter that should be changed
					// value ... new value
					// size ... 0 for auto or 1, 2, 4 (Byte)
					function setConfig (instId, parameter, value, size) {
						var parameter = parseInt(parameter) || null,
							value = parseInt(value) || null,
							size = parseInt(size) || null;

						if(instId === instanceId && !!parameter && !!value && !!size){
							// set config after inclusion only and if it doesn't exist or isn't equal
							if(commandClassId === 112 && deviceCC && c.data.lastIncludedDevice.value === nodeId && (!deviceCC.data[parameter] || (deviceCC.data[parameter] && deviceCC.data[parameter].val.value !== value))){
								deviceCC.Set(parameter, value, size);

								// console output
								console.log('#######################', 'CHANGE CONFIGURATION OF #'+ nodeId,'###############################');
								console.log('###');
								console.log('###', 'Change configuration of instance ' + instId + ':');
								console.log('###', 'parameter:', parameter);
								console.log('###', 'value:', value);
								console.log('###', 'size:', size);
								console.log('###');
								console.log('###############################################################################################');
							}
						}
					}

					// change CC entries by entering (runs once after inclusion):
					// instId ... instance ID
					// commandClass ... Command Class ID
					// dataType ... data type object that should be changed -e.g. security, version, interviewDone
					// key ... of this data type object
					// value ... new value
					function setCCData (instId, commandClass, dataType, key, value) {
						var commandClass = parseInt(commandClass, 10);

						if (commandClassId === commandClass && 
								deviceInstances[instId].commandClasses[commandClass] 
									&& c.data.lastIncludedDevice.value === nodeId){ 
													
							// set value
							if (typeof value !== 'undefined' &&
									deviceInstances[instId].commandClasses[commandClass].data[dataType] &&
										deviceInstances[instId].commandClasses[commandClass].data[dataType][key] &&
											deviceInstances[instId].commandClasses[commandClass].data[dataType][key] !== value) {
								
								deviceInstances[instId].commandClasses[commandClass].data[dataType][key] = value;

								// console output
								console.log('#######################', 'SET COMMANDCLASS DATA OF:', devId,'################################');
								console.log('###');
								console.log('###', 'Change CC entry of instance ' + instId + ':');
								console.log('###', 'CC:', commandClass);
								console.log('###', 'data type object that has changed:', dataType);
								console.log('###', 'new value for ' + key +':', value);
								console.log('###');
								console.log('##############################################################################################');
							}
						}
					}

					// change the node name (runs once after inclusion):
					function renameNode(nodeName) {

						if (nodeName !== deviceData.givenName.value) {

							// do something
							deviceData.givenName.value = nodeName && nodeName !== '' && !!nodeName? nodeName : deviceData.givenName.value;

							// console output
							console.log('#######################', 'Apply postfix #'+ nodeId,'################################');
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
									    intDelay = (new Date()).valueOf() + 5*1000; // wait not more than 5 seconds for single interview

									// wait till interview is done
									while ((new Date()).valueOf() < intDelay &&  intDone === false) {
										intDone = deviceCC.data.interviewDone.value;
									}
									
									if (intDone === false) {
										try {
											// call preInteview functions from postfix.json
											postFix.forEach(function(fix){
												if (!!fix.preInterview && fix.preInterview && fix.preInterview.length > 0) {
													fix.preInterview.forEach(function(func){
														eval(func);
													});
												}
											});
										} catch(e) {
											// console output
											console.log('##############', 'INTERVIEW-HAS-FAILED-----PREFIX-HAS-FAILED:', '#' + nodeId,'#######################');
											console.log('###');
											console.log('###', 'ERROR:', e.message);
											console.log('###');
											console.log('######################################################################################################');
										}
									}
								}
								
								// call postInterview functions from postfix.json
								postFix.forEach(function(fix) {
									if(!!fix.postInterview && fix.postInterview && fix.postInterview.length > 0) {
										fix.postInterview.forEach(function(entry) {
											var splittedEntry = entry.split(','),
												devICC = instanceId + '-' + commandClassId;

											if (splittedEntry.length > 0) {

												switch (splittedEntry[0]) {
													case 'rename':
													case 'hide':
													case 'deactivate':
													case 'icon':
														if (splittedEntry[1] && splittedEntry[1].indexOf(devICC) > -1 && c.data.lastIncludedDevice.value === nodeId) {
															//add devId
															if (!changeVDev[splittedEntry[1]]) {
																changeVDev[splittedEntry[1]] = {};
															}

															// devId (instId-CC-sCC-eT) / postFix type / value - fallback true for hide / deactivate
															changeVDev[splittedEntry[1]][splittedEntry[0]] = splittedEntry[2] ? splittedEntry[2] : true;
														}

														break;
													case 'noVDev':

														if (splittedEntry[1] && splittedEntry[1].indexOf(devICC) > -1) {
															//add devId
															if (!changeVDev[splittedEntry[1]]) {
																changeVDev[splittedEntry[1]] = {};
															}

															// devId (instId-CC-sCC-eT) without creation
															changeVDev[splittedEntry[1]].noVDev = true;
														}

														break;
													case 'renameNode':
														if (splittedEntry[1] && c.data.lastIncludedDevice.value === nodeId) {
															renameNode(splittedEntry[1]);
														}

														break;
													default:
														eval(entry);
												}
											}
										});
									}
								});
							} catch(e) {
								// console output
								console.log('#######################', 'PRE-OR-POSTFIX-ERROR:', '#' + nodeId,'################################');
								console.log('###');
								console.log('###', 'ERROR:', e.message);
								console.log('###');
								console.log('#################################################################################################');
							}
						}
					}

					var ccId = instanceId + '-' + commandClassId;

					if (!changeVDev[ccId] || (changeVDev[ccId] && !changeVDev[ccId].noVDev)) {
						self.parseAddCommandClass(nodeId, instanceId, commandClassId, false, changeVDev);
					} else if (changeVDev[ccId] && changeVDev[ccId].noVDev) {
						var devId = "ZWayVDev_" + self.config.name + "_" + nodeId + '-' + ccId;
						// console output
						console.log('#######################', 'Apply postfix for:', devId,'################################');
						console.log('###');
						console.log('###', 'not created');
						console.log('###');
						console.log('########################################################################################');
					}
				} else {
					self.parseDelCommandClass(nodeId, instanceId, commandClassId, false);
				}
			}, "value");
		} else {
			self.parseDelCommandClass(nodeId, instanceId, commandClassId);
		}
	}, this.ZWAY_DEVICE_CHANGE_TYPES["CommandAdded"] | this.ZWAY_DEVICE_CHANGE_TYPES["CommandRemoved"] | this.ZWAY_DEVICE_CHANGE_TYPES["EnumerateExisting"]);

	self.dataBind(self.gateDataBinding, self.zway, "lastExcludedDevice", function(type) {
		var _id = this.value,
		    _toRemove = self.controller.devices.filter(function (el) { return el.id.indexOf("ZWayVDev_" + self.config.name + "_" + _id + '-') === 0; }).map(function(el) { return el.id; });

		_toRemove.forEach(function (name) {
			self.controller.devices.remove(name);
			self.controller.devices.cleanup(name);
		});
	}, "");	
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

ZWave.prototype.parseAddCommandClass = function (nodeId, instanceId, commandClassId, scaleAdded, changeVDev) {
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
		changeDevId = instanceId + separ + vDevIdC,
		defaults;
		// vDev is not in this scope, but in {} scope for each type of device to allow reuse it without closures

	try {
		if (!cc.data.supported.value) {
			return; // do not handle unsupported Command Classes
		}

		/*
		// Ignore SwitchBinary if SwitchMultilevel exists
		if (this.CC["SwitchBinary"] === commandClassId && in_array(instanceCommandClasses, this.CC["SwitchMultilevel"]) && instance.commandClasses[this.CC["SwitchMultilevel"]].data.supported.value) {
			// console.log("Ignoring SwitchBinary due to SwitchMultilevel existence");
			return;
		}
		if (this.CC["SwitchMultilevel"] === commandClassId && this.controller.devices.get(vDevIdPrefix + vDevIdNI + separ + this.CC["SwitchBinary"])) {
			// console.log("Removing SwitchBinary due to SwitchMultilevel existence");
			this.controller.devices.remove(vDevIdPrefix + vDevIdNI + separ + this.CC["SwitchBinary"]);
		}
		*/

		var vendorName = "";
		if (this.zway.devices[nodeId].data.vendorString.value) {
			vendorName = this.zway.devices[nodeId].data.vendorString.value;
		}

		function compileTitle() {
			var args = [],
				sortArgs = [],
				last = 0,
				addVendor = true;

			for (var i = 0; i < arguments.length; i++) {
				args.push(arguments[i]);
			}

			last = args.length - 1

			if (args[last] === false) {
				addVendor = false;
				// move by one position to id
				last = args.length - 2;
			}

			// add vendorName on first position
			if (vendorName && addVendor) {
				sortArgs.push(vendorName);
			}

			// add probeType on second position if available
			if(last > 1 && args[1]) {
				sortArgs.push(args[1]);
			}

			// add CC type if array is still empty
			if (sortArgs.length < 1) {
				sortArgs.push(args[0]);
			}

			// add CC type
			if (sortArgs.indexOf(args[0]) < 0 && args[0] !== 'Sensor') {
				sortArgs.push(args[0]);
			}

			// add id
			sortArgs.push('(' + args[last].replace(/-/g, '.') + ')');
			
			return sortArgs.join(' ');
		}

		function postfixLog(devId, changeObj) {

			try {
				// console output
				console.log('#######################', 'Apply postfix for:', devId,'################################');
				console.log('###');

				if (changeObj.noVDev) {
					console.log('###', 'not created');
				} else {
					Object.keys(changeObj).forEach(function (key) {
						console.log('###', 'change ' + key + ' into:', changeObj[key]);
					});
				}

				console.log('###');
				console.log('########################################################################################');
			} catch (e) {
				console.log('Error in postfix log:', e.message);
			}
		}

		function applyPostfix(defaultObj, changeObj, devId, devIdNI) {
			defaultObj.metrics.icon = changeObj.icon? changeObj.icon : defaultObj.metrics.icon;
			defaultObj.metrics.title = changeObj.rename? compileTitle(changeObj.rename, devIdNI, false) : defaultObj.metrics.title;
			defaultObj.visibility = changeObj.hide? false : true;
			defaultObj.permanently_hidden = changeObj.deactivate? true : false;

			postfixLog(devId, changeObj);

			return defaultObj;
		}

		if (this.CC["SwitchBinary"] === commandClassId && !self.controller.devices.get(vDevId)) {

			defaults = {
				deviceType: "switchBinary",
				metrics: {
					icon: 'switch',
					title: compileTitle('Switch', vDevIdNI)
				}
			};

			// apply postfix if available
			if (changeVDev[changeDevId]) {
				defaults = applyPostfix(defaults, changeVDev[changeDevId], vDevId, vDevIdNI);
			}

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
			var isMotor = this.zway.devices[nodeId].data.genericType.value === 0x11 && _.contains([3, 5, 6, 7], this.zway.devices[nodeId].data.specificType.value);

			defaults = {
				deviceType: "switchMultilevel",
				probeType: isMotor ? 'motor' : 'multilevel',
				metrics: {
					icon: isMotor ? 'blinds' : 'multilevel',
					title: compileTitle(isMotor ? 'Blind' : 'Dimmer', vDevIdNI)
				}
			};

			// apply postfix if available
			if (changeVDev[changeDevId]) {
				defaults = applyPostfix(defaults, changeVDev[changeDevId], vDevId, vDevIdNI);
			}


			var vDev = self.controller.devices.create({
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
						return;
					} else if ("startUp" === command) {
						cc.StartLevelChange(0);
						return;
					} else if ("startDown" === command) {
						cc.StartLevelChange(1);
						return;
					} else if ("update" === command) {
						cc.Get(vDevId);
						return;
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

				var defaults =  {
					deviceType: "switchRGBW",
					probeType: 'switchColor_rgb',
					metrics: {
						icon: 'multilevel',
						title: compileTitle('Color', vDevIdNI + separ + vDevIdC),
						color: {r: cc.data[COLOR_RED].level.value, g: cc.data[COLOR_GREEN].level.value, b: cc.data[COLOR_BLUE].level.value},
						level: 'off'
					}
				}

				// apply postfix if available
				if (changeVDev[changeDevId]) {
					defaults = applyPostfix(defaults, changeVDev[changeDevId], vDevId + separ + "rgb", vDevIdNI + separ + vDevIdC);
				}

				var vDev_rgb = this.controller.devices.create({
					deviceId: vDevId + separ + "rgb",
					defaults: defaults,
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
					var cVDId = changeDevId + separ + colorId;

					// check if it should be created
					if (!changeVDev[cVDId] || changeVDev[cVDId] && !changeVDev[cVDId].noVDev) {
             			defaults = {
							deviceType: "switchMultilevel",
							probeType: '',
							metrics: {
								icon: 'multilevel',
								title: compileTitle(cc.data[colorId].capabilityString.value, vDevIdNI + separ + vDevIdC + separ + colorId),
								level: 'off'
							}
						}

						// apply postfix if available
						if (changeVDev[cVDId]) {
							defaults = applyPostfix(defaults, changeVDev[cVDId], vDevId + separ + colorId, vDevIdNI + separ + vDevIdC + separ + colorId);
						}

						switch(colorId) {
							case 0:
								defaults.probeType = 'switchColor_soft_white';
								break;
							case 1:
								defaults.probeType = 'switchColor_cold_white';
								break;
							case 2:
								defaults.probeType = 'switchColor_red';
								break;
							case 3:
								defaults.probeType = 'switchColor_green';
								break;
							case 4:
								defaults.probeType = 'switchColor_blue';
								break;
						}

						var vDev = self.controller.devices.create({
							deviceId: vDevId + separ + colorId,
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
				}
			});
		} else if (this.CC["SensorBinary"] === commandClassId) {
			defaults = {
				deviceType: 'sensorBinary',
				probeType: '',
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

					var cVDId = changeDevId + separ + sensorTypeId;
					// check if it should be created
					if (!changeVDev[cVDId] || changeVDev[cVDId] && !changeVDev[cVDId].noVDev) {

						defaults.metrics.probeTitle = cc.data[sensorTypeId].sensorTypeString.value;
						defaults.metrics.title = compileTitle('Sensor', defaults.metrics.probeTitle, vDevIdNI + separ + vDevIdC + separ + sensorTypeId);
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

						// apply postfix if available
						if (changeVDev[cVDId]) {
							defaults = applyPostfix(defaults, changeVDev[cVDId], vDevId + separ + sensorTypeId, vDevIdNI + separ + vDevIdC + separ + sensorTypeId);
						}

						var vDev = self.controller.devices.create({
							deviceId: vDevId + separ + sensorTypeId,
							defaults: defaults,
							overlay: {},
							handler: function (command) {
								if (command === "update") {
									cc.Get(sensorTypeId);
								}
							},
							moduleId: self.id
						});

						if (vDev) {
							self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, sensorTypeId + ".level", function (type) {
								if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
									self.controller.devices.remove(vDevId + separ + sensorTypeId);
								} else {
									try {
										vDev.set("metrics:level", this.value ? "on" : "off");
									} catch (e) {
									}
									;
								}
							}, "value");
						}
					}
				}
			});
			if (!scaleAdded) {
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "", function(type) {
					if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
						self.parseAddCommandClass(nodeId, instanceId, commandClassId, true, changeVDev);
					}
				}, "child");
			}
		} else if (this.CC["SensorMultilevel"] === commandClassId) {
			defaults = {
				deviceType: "sensorMultilevel",
				probeType: '',
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

					var cVDId = changeDevId + separ + sensorTypeId;

					// check if it should be created
					if (!changeVDev[cVDId] || changeVDev[cVDId] && !changeVDev[cVDId].noVDev) {

						defaults.metrics.probeTitle = cc.data[sensorTypeId].sensorTypeString.value;
						defaults.metrics.scaleTitle = cc.data[sensorTypeId].scaleString.value;
						defaults.metrics.title = compileTitle('Sensor', defaults.metrics.probeTitle, vDevIdNI + separ + vDevIdC + separ + sensorTypeId);
						if (sensorTypeId === 1) {
							defaults.metrics.icon = "temperature";
							defaults.probeType = defaults.metrics.icon;
						} else if (sensorTypeId === 3) {
							defaults.metrics.icon = "luminosity";
							defaults.probeType = defaults.metrics.icon;
						} else if (sensorTypeId === 4 || sensorTypeId === 15 || sensorTypeId === 16) {
							defaults.metrics.icon = "energy";
							defaults.probeType = defaults.metrics.icon;
						} else if (sensorTypeId === 5) {
							defaults.metrics.icon = "humidity";
							defaults.probeType = defaults.metrics.icon;
						} else if (sensorTypeId === 9) {
							defaults.metrics.icon = "barometer";
							defaults.probeType = defaults.metrics.icon;
						} else if (sensorTypeId === 25) {
							defaults.metrics.icon = "seismic";
							defaults.probeType = defaults.metrics.icon;
						} else if (sensorTypeId === 27) {
							defaults.metrics.icon = "ultraviolet";
							defaults.probeType = defaults.metrics.icon;
						} else if (sensorTypeId === 52) {
							defaults.metrics.icon = "acceleration_x";
							defaults.probeType = defaults.metrics.icon;
						} else if (sensorTypeId === 53) {
							defaults.metrics.icon = "acceleration_y";
							defaults.probeType = defaults.metrics.icon;
						} else if (sensorTypeId === 54) {
							defaults.metrics.icon = "acceleration_z";
							defaults.probeType = defaults.metrics.icon;
						}

						// apply postfix if available
						if (changeVDev[cVDId]) {
							defaults = applyPostfix(defaults, changeVDev[cVDId], vDevId + separ + sensorTypeId, vDevIdNI + separ + vDevIdC + separ + sensorTypeId);
						}

						var vDev = self.controller.devices.create({
							deviceId: vDevId + separ + sensorTypeId,
							defaults: defaults,
							overlay: {},
							handler: function (command) {
								if (command === "update") {
									cc.Get(sensorTypeId);
								}
							},
							moduleId: self.id
						});

						if (vDev) {
							self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, sensorTypeId + ".val", function (type) {
								if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
									self.controller.devices.remove(vDevId + separ + sensorTypeId);
								} else {
									try {
										vDev.set("metrics:level", this.value);
									} catch (e) {
									}
								}
							}, "value");
						}
					}
				}
			});
			if (!scaleAdded) {
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "", function(type) {
					if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
						self.parseAddCommandClass(nodeId, instanceId, commandClassId, true, changeVDev);
					}
				}, "child");
			}
		} else if (this.CC["Meter"] === commandClassId) {
			defaults = {
				deviceType: 'sensorMultilevel',
				probeType: '',
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
					var cVDId = changeDevId + separ + scaleId;
					// check if it should be created
					if (!changeVDev[cVDId] || changeVDev[cVDId] && !changeVDev[cVDId].noVDev) {
						defaults.metrics.probeTitle = cc.data[scaleId].sensorTypeString.value;
						defaults.metrics.scaleTitle = cc.data[scaleId].scaleString.value;
						defaults.metrics.title = compileTitle('Meter', defaults.metrics.probeTitle, vDevIdNI + separ + vDevIdC + separ + scaleId);

						switch (scaleId) {
							case 0:
								defaults.probeType = 'meterElectric_kilowatt_per_hour';
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

						// apply postfix if available
						if (changeVDev[cVDId]) {
							defaults = applyPostfix(defaults, changeVDev[cVDId], vDevId + separ + scaleId, vDevIdNI + separ + vDevIdC + separ + scaleId);
						}

						var vDev = self.controller.devices.create({
							deviceId: vDevId + separ + scaleId,
							defaults: defaults,
							overlay: {},
							handler: function (command) {
								if (command === "update") {
									cc.Get(scaleId);
								}
							},
							moduleId: self.id
						});

						if (vDev) {
							self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, scaleId + ".val", function (type) {
								if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
									self.controller.devices.remove(vDevId + separ + scaleId);
								} else {
									try {
										vDev.set("metrics:level", this.value);
									} catch (e) {
									}
								}
							}, "value");
						}
					}
				}
			});
			if (!scaleAdded) {
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "", function(type) {
					if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
						self.parseAddCommandClass(nodeId, instanceId, commandClassId, true, changeVDev);
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

			// apply postfix if available
			if (changeVDev[changeDevId]) {
				defaults = applyPostfix(defaults, changeVDev[changeDevId], vDevId, vDevIdNI);
			}

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

			// apply postfix if available
			if (changeVDev[changeDevId]) {
				defaults = applyPostfix(defaults, changeVDev[changeDevId], vDevId, vDevIdNI);
			}

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
		} else if (this.CC["BarrierOperator"] === commandClassId && !self.controller.devices.get(vDevId)) {

			defaults = {
				deviceType: 'doorlock',
				metrics: {
					level: '',
					icon: 'door',
					title: compileTitle('Garage Door', vDevIdNI)
				}
			};

			// apply postfix if available
			if (changeVDev[changeDevId]) {
				defaults = applyPostfix(defaults, changeVDev[changeDevId], vDevId, vDevIdNI);
			}

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
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "state", function() {
					try {
						vDev.set("metrics:level", this.value === 255 ? "open" : "close");
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

				if (withModeOff && (withModeHeat || withModeCool)) {

					defaults = {
						deviceType: "switchBinary",
						probeType:'thermostat_mode',
						metrics: {
							icon: 'thermostat',
							title: compileTitle("Thermostat operation", vDevIdNI)
						}
					};

					// apply postfix if available
					if (changeVDev[changeDevId]) {
						defaults = applyPostfix(defaults, changeVDev[changeDevId], deviceNamePrefix + this.CC["ThermostatMode"], vDevIdNI);
					}

					var m_vDev = self.controller.devices.create({
						deviceId: deviceNamePrefix + this.CC["ThermostatMode"],
						defaults: defaults,
						overlay: {},
						handler: function (command) {
							if ("on" === command) {
								var lastMode = withModeHeat ? MODE_HEAT : MODE_COOL;
								
								// modes are not always same in ThermostatSetPoint and in ThermostatMode, but here they are same
								if (withModeHeat && withModeCool && instance.ThermostatSetPoint && instance.ThermostatSetPoint.data[MODE_HEAT] && instance.ThermostatSetPoint.data[MODE_COOL]) {
									lastMode = instance.ThermostatSetPoint.data[MODE_HEAT].setVal.updateTime > instance.ThermostatSetPoint.data[MODE_COOL].setVal.updateTime ? MODE_HEAT : MODE_COOL;
								}
								instance.ThermostatMode.Set(lastMode);
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

			if (withTemp) {
				var withTempHeat = instance.ThermostatSetPoint.data[MODE_HEAT],
					withTempCool = instance.ThermostatSetPoint.data[MODE_COOL],
					modes = [];
				
				withTempHeat && modes.push(MODE_HEAT);
				withTempCool && modes.push(MODE_COOL);
				
				var t_vDev = [];
				modes.forEach(function(mode) {
					var cVDId = changeDevId + separ + mode;
					// check if it should be created
					if (!changeVDev[cVDId] || changeVDev[cVDId] && !changeVDev[cVDId].noVDev) {
						var DH = instance.ThermostatSetPoint.data[mode],
							_vDevId = deviceNamePrefix + self.CC["ThermostatSetPoint"] + "-" + mode;

						if (!self.controller.devices.get(_vDevId)) {

							var defaults = {
								deviceType: "thermostat",
									probeType: 'thermostat_set_point',
									metrics: {
									scaleTitle: DH.scaleString.value,
										level: DH.val.value,
										min: DH.min ? DH.min.value : (DH.scale.value === 0 ? 5 : 41),
										max: DH.max ? DH.max.value : (DH.scale.value === 0 ? 40 : 104),
										icon: 'thermostat',
										title: compileTitle("Thermostat " + (mode === MODE_HEAT ? "Heat" : "Cool"), vDevIdNI)
								}
							}

							// apply postfix if available
							if (changeVDev[cVDId]) {
								defaults = applyPostfix(defaults, changeVDev[cVDId], _vDevId, vDevIdNI);
							}

							t_vDev[mode] = self.controller.devices.create({
								deviceId: _vDevId,
								defaults: defaults,
								overlay: {},
								handler: function (command, args) {
									instance.ThermostatSetPoint.Set(mode, args.level);
									instance.ThermostatMode && instance.ThermostatMode.Set(mode == MODE_HEAT ? MODE_HEAT : MODE_COOL); // modes are not always same in ThermostatSetPoint and in ThermostatMode, but here they are same
								},
								moduleId: self.id
							});

							if (t_vDev[mode]) {
								self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, self.CC["ThermostatSetPoint"], mode + ".setVal", function (type) {
									if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
										delete t_vDev[mode];
										self.controller.devices.remove(_vDevId);
									} else {
										try {
											t_vDev[mode].set("metrics:level", this.value);
										} catch (e) {
										}
									}
								});
							}
						}
					}
				});
			}
		} else if (this.CC["AlarmSensor"] === commandClassId) {
			a_defaults = {
				deviceType: 'sensorBinary',
				probeType: '',
				metrics: {
					icon: 'alarm',
					level: 'off',
					title: ''
				}
			};

			Object.keys(cc.data).forEach(function (sensorTypeId) {

					sensorTypeId = parseInt(sensorTypeId, 10);

					var a_id = vDevId + separ + sensorTypeId + separ + "A";

					if (!isNaN(sensorTypeId) && !self.controller.devices.get(a_id)) {
						var cVDId = changeDevId + separ + sensorTypeId;

						// check if it should be created
						if (!changeVDev[cVDId] || changeVDev[cVDId] && !changeVDev[cVDId].noVDev) {
							a_defaults.metrics.title = compileTitle('Alarm', cc.data[sensorTypeId].typeString.value, vDevIdNI + separ + vDevIdC + separ + sensorTypeId);

							switch (sensorTypeId) {
								case 0:
									a_defaults.probeType = 'alarmSensor_general_purpose';
									break;
								case 1:
									a_defaults.probeType = 'alarmSensor_smoke';
									break;
								case 2:
									a_defaults.probeType = 'alarmSensor_co';
									break;
								case 3:
									a_defaults.probeType = 'alarmSensor_coo';
									break;
								case 4:
									a_defaults.probeType = 'alarmSensor_heat';
									break;
								case 5:
									a_defaults.probeType = 'alarmSensor_flood';
									break;
								case 6:
									a_defaults.probeType = 'alarmSensor_door';
									break;
								case 7:
									a_defaults.probeType = 'alarmSensor_burglar';
									break;
								case 8:
									a_defaults.probeType = 'alarmSensor_power';
									break;
								case 9:
									a_defaults.probeType = 'alarmSensor_system';
									break;
								case 10:
									a_defaults.probeType = 'alarmSensor_emergency';
									break;
								case 11:
									a_defaults.probeType = 'alarmSensor_clock';
									break;
								default:
									break;
							}

							// apply postfix if available
							if (changeVDev[cVDId]) {
								a_defaults = applyPostfix(a_defaults, changeVDev[cVDId], a_id, vDevIdNI + separ + vDevIdC + separ + sensorTypeId);
							}

							var a_vDev = self.controller.devices.create({
								deviceId: a_id,
								defaults: a_defaults,
								overlay: {},
								handler: function (command) {
									if (command === "update") {
										cc.Get(sensorTypeId);
									}
								},
								moduleId: self.id
							});

							if (a_vDev) {
								self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, sensorTypeId + ".sensorState", function (type) {
									if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
										self.controller.devices.remove(vDevId + separ + sensorTypeId + separ + "A");
									} else {
										try {
											a_vDev.set("metrics:level", this.value ? "on" : "off");
										} catch (e) {
										}
									}
								}, "value");
							}
						}
					}
			});
			if (!scaleAdded) {
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "", function(type) {
					if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
						self.parseAddCommandClass(nodeId, instanceId, commandClassId, true, changeVDev);
					}
				}, "child");
			}
		} else if (this.CC["Alarm"] === commandClassId) {
			if (cc.data.version.value < 3) return; // We skip old Alarm CC implementations handling only v3 (Notification)
			
			a_defaults = {
				deviceType: 'sensorBinary',
				probeType: '',
				metrics: {
					icon: 'alarm',
					level: 'off',
					title: ''
				}
			};
			Object.keys(cc.data).forEach(function (notificationTypeId) {

					notificationTypeId = parseInt(notificationTypeId, 10);

					if (!isNaN(notificationTypeId)) {
						var cVDId = changeDevId + separ + notificationTypeId;
						// check if it should be created
						if (!changeVDev[cVDId] || changeVDev[cVDId] && !changeVDev[cVDId].noVDev) {

							var DOOR_OPEN = 0x16, DOOR_CLOSE = 0x17;
							if (notificationTypeId === 0x06 && (cc.data[notificationTypeId].eventMask.value & ((1 << DOOR_OPEN) | (1 << DOOR_CLOSE)))) { // Very special case of Door
								a_defaults.metrics.icon = 'door';

								var a_id = vDevId + separ + notificationTypeId + separ + 'Door' + separ + "A";

								if (!self.controller.devices.get(a_id)) {
									a_defaults.metrics.title = renameDevices[notificationTypeId] && renameDevices[notificationTypeId]['name'] ? compileTitle(renameDevices[notificationTypeId]['name'], vDevIdNI + separ + vDevIdC + separ + notificationTypeId + separ + 'Door', false) : compileTitle('Alarm', cc.data[notificationTypeId].typeString.value, vDevIdNI + separ + vDevIdC + separ + notificationTypeId + separ + 'Door');
									a_defaults.probeType = 'alarm_door';
									a_defaults.metrics.icon = changeIcons[notificationTypeId] && changeIcons[notificationTypeId]['icon'] ? changeIcons[notificationTypeId]['icon'] : a_defaults.metrics.icon;

									var a_vDev = self.controller.devices.create({
										deviceId: a_id,
										defaults: a_defaults,
										overlay: {},
										handler: function (command) {
											if (command === "update") {
												cc.Get(0, notificationTypeId, DOOR_OPEN);
												cc.Get(0, notificationTypeId, DOOR_CLOSE);
											}
										},
										moduleId: self.id
									});

									if (a_vDev) {
										self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, notificationTypeId.toString(10), function (type) {
											if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
												self.controller.devices.remove(vDevId + separ + notificationTypeId + separ + 'Door' + separ + "A");
											} else {
												if (this.event.value === DOOR_OPEN || this.event.value === DOOR_CLOSE) {
													try {
														a_vDev.set("metrics:level", (this.event.value == DOOR_OPEN) ? "on" : "off");
													} catch (e) {
													}
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
									a_defaults.probeType = 'alarm_smoke';
									break;
								case 0x02: // CO
									a_defaults.metrics.icon = 'co';
									a_defaults.probeType = 'alarm_co';
									break;
								case 0x03: // CO2
									a_defaults.metrics.icon = 'co';
									a_defaults.probeType = 'alarm_coo';
									break;
								case 0x04: // Heat
									a_defaults.metrics.icon = 'alarm';
									a_defaults.probeType = 'alarm_heat';
									break;
								case 0x05: // Water
									a_defaults.metrics.icon = 'flood';
									a_defaults.probeType = 'alarm_flood';
									break;
								case 0x07: // Home Security (Burglar)
									a_defaults.metrics.icon = 'smoke';
									a_defaults.probeType = 'alarm_burglar';
									break;
								case 0x08: // Power
									a_defaults.metrics.icon = 'alarm';
									a_defaults.probeType = 'alarm_power';
									break;
								case 0x09: // System
									a_defaults.metrics.icon = 'alarm';
									a_defaults.probeType = 'alarm_system';
									break;
								case 0x0a: // Emergency
									a_defaults.metrics.icon = 'alarm';
									a_defaults.probeType = 'alarm_emergency';
									break;
								case 0x0b: // Clock
									a_defaults.metrics.icon = 'alarm';
									a_defaults.probeType = 'alarm_clock';
									break;
								default:
									return; // skip this type
							}

							maskToTypes = function (bitmask) {
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

							// handle 0xFE unknown
							// special case by Sigma for Unknown event - not listed in eventMask
							// the vDev for this event will be created on the fly
							{
								if (!self.ccAlarmUnknownEventBinded) {
									self.ccAlarmUnknownEventBinded = [];
								}
								var a_id = vDevId + separ + notificationTypeId + separ + 0xFE + separ + "A";
								if (!self.ccAlarmUnknownEventBinded[a_id]) {
									self.ccAlarmUnknownEventBinded[a_id] = true;
									self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, notificationTypeId.toString(10) + ".event", function (type) {
										var eventTypeId = parseInt(this.value, 10);
										if (eventTypeId === 0xFE) {
											var cVDId = changeDevId + separ + notificationTypeId + separ + eventTypeId;
											// check if it should be created
											if (!changeVDev[cVDId] || changeVDev[cVDId] && !changeVDev[cVDId].noVDev) {

												if (!self.controller.devices.get(a_id)) {
													a_defaults.metrics.title = compileTitle('Alarm', cc.data[notificationTypeId].typeString.value, vDevIdNI + separ + vDevIdC + separ + notificationTypeId + separ + eventTypeId);

													// apply postfix if available
													if (changeVDev[cVDId]) {
														a_defaults = applyPostfix(a_defaults, changeVDev[cVDId], a_id, vDevIdNI + separ + vDevIdC + separ + notificationTypeId + separ + eventTypeId);
													}

													var a_vDev = self.controller.devices.create({
														deviceId: a_id,
														defaults: a_defaults,
														overlay: {},
														handler: function (command) {
															if (command === "update") {
																cc.Get(0, notificationTypeId, eventTypeId);
															}
														},
														moduleId: self.id
													});

													if (a_vDev) {
														self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, notificationTypeId.toString(10), function (type) {
															if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
																self.controller.devices.remove(vDevId + separ + notificationTypeId + separ + eventTypeId + separ + "A");
															} else {
																if (this.event.value === eventTypeId || this.event.value === 0) {
																	try {
																		a_vDev.set("metrics:level", this.event.value ? "on" : "off");
																	} catch (e) {
																	}
																}
															}
														}, "value");
													}
												}
											}
										}
									});
								}
							}

							maskToTypes(cc.data[notificationTypeId].eventMask.value).forEach(function (eventTypeId) {

								eventTypeId = parseInt(eventTypeId, 10);

								var a_id = vDevId + separ + notificationTypeId + separ + eventTypeId + separ + "A";

								if (!isNaN(eventTypeId) && !self.controller.devices.get(a_id)) {
									var cVDId = changeDevId + separ + notificationTypeId + separ + eventTypeId;
									// check if it should be created
									if (!changeVDev[cVDId] || changeVDev[cVDId] && !changeVDev[cVDId].noVDev) {
										a_defaults.metrics.title = compileTitle('Alarm', cc.data[notificationTypeId].typeString.value, vDevIdNI + separ + vDevIdC + separ + notificationTypeId + separ + eventTypeId);

										// apply postfix if available
										if (changeVDev[cVDId]) {
											a_defaults = applyPostfix(a_defaults, changeVDev[cVDId], a_id, vDevIdNI + separ + vDevIdC + separ + notificationTypeId + separ + eventTypeId);
										}

										var a_vDev = self.controller.devices.create({
											deviceId: a_id,
											defaults: a_defaults,
											overlay: {},
											handler: function (command) {
												if (command === "update") {
													cc.Get(0, notificationTypeId, eventTypeId);
												}
											},
											moduleId: self.id
										});

										if (a_vDev) {
											self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, notificationTypeId.toString(10), function (type) {
												if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
													self.controller.devices.remove(vDevId + separ + notificationTypeId + separ + eventTypeId + separ + "A");
												} else {
													if (this.event.value === eventTypeId || this.event.value === 0) {
														try {
															a_vDev.set("metrics:level", this.event.value ? "on" : "off");
														} catch (e) {
														}
													}
												}
											}, "value");
										}
									}
								}
							});
						}
					}
			});
			if (!scaleAdded) {
				self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "", function(type) {
					if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
						self.parseAddCommandClass(nodeId, instanceId, commandClassId, true, changeVDev);
					}
				}, "child");
			}
		} else if (this.CC["DeviceResetLocally"] === commandClassId) {
			self.dataBind(self.gateDataBinding, self.zway, nodeId, instanceId, commandClassId, "reset", function(type) {
				if (this.value) {
					var moduleName = self.getName(),
					    langFile = self.controller.loadModuleLang(moduleName);
					
					self.controller.addNotification("error", langFile.err_reset + nodeId, "connection", moduleName);
				}
			});
		}
	} catch (e) {
		var moduleName = this.getName(),
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
